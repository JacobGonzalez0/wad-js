// mus2midi.js -- based off https://github.com/sirjuddington/SLADE/blob/master/src/External/mus2mid/mus2mid.cpp

// Read a MUS file from a lump data (musinput) and output a MIDI blob
//
// Returns ArrayBuffer if successful, false otherwise
class Mus2midi{
    constructor(musinput) {
        // MUS event codes
        this.mus_releasekey          = 0x00;
        this.mus_presskey            = 0x10;
        this.mus_pitchwheel          = 0x20;
        this.mus_systemevent         = 0x30;
        this.mus_changecontroller    = 0x40;
        this.mus_scoreend            = 0x60;
    
        // MIDI event codes
        this.midi_releasekey         = 0x80;
        this.midi_presskey           = 0x90;
        this.midi_aftertouchkey      = 0xA0;
        this.midi_changecontroller   = 0xB0;
        this.midi_changepatch        = 0xC0;
        this.midi_aftertouchchannel  = 0xD0;
        this.midi_pitchwheel         = 0xE0;
    
        // Structure to hold MUS file header
        this.musheader = {
            id : [],
            scorelength : null,
            scorestart : null,
            primarychannels : null,
            secondarychannels : null,
            instrumentcount : null
        }
        
        // Standard MIDI type 0 header + track header
        /*
        const uint8_t midiheader[] =
        {
            'M', 'T', 'h', 'd',     // Main header
            0x00, 0x00, 0x00, 0x06, // Header size
            0x00, 0x00,             // MIDI type (0)
            0x00, 0x01,             // Number of tracks
            0x00, 0x46,             // Resolution
            'M', 'T', 'r', 'k',     // Start of track
            0x00, 0x00, 0x00, 0x00  // Placeholder for track length
        };
        */
        // ^ this is the standard first 22 bytes of the midi output, aside from adding the track length.
        // I should create a function that adds this data manually with the DataView
        
    
        this.musDataView;
        this.musDataPosition;
    
        // Constants
        this.NUM_CHANNELS = 16
        this.MUS_PERCUSSION_CHAN = 15
        this.MIDI_PERCUSSION_CHAN = 9
        this.MIDI_TRACKLENGTH_OFS = 18
    
        // Cached channel velocities
        this.channelvelocities = [ 127, 127, 127, 127, 127, 127, 127, 127,
                                  127, 127, 127, 127, 127, 127, 127, 127 ];
    
        // Timestamps between sequences of MUS events
        this.queuedtime = 0;
    
        // Counter for the length of the track
        this.tracksize;
    
        this.controller_map = [ 0x00, 0x20, 0x01, 0x07, 0x0A, 0x0B, 0x5B, 0x5D,
                               0x40, 0x43, 0x78, 0x7B, 0x7E, 0x7F, 0x79 ];
    
        this.channel_map = [];
    
        // Main DataView for writing to. This is used by writeData();
        this.outputDataView;
        this.writePosition = 0;
    
        // Wrapper function to work like slade's memchunk.write()
        // I'm so lazy
        this.position = 0;
        this.dataToWrite = [];
    
    
        var masterOutput = this.convertMusToMidi(musinput);
        if (masterOutput != false) return masterOutput;
        else {
            console.log("Failed to convert mus to midi. Sucks.");
            console.log(musDataPosition);
            console.log(musinput.byteLength);
            console.log(masterOutput);
            return false;
        }
    }

    getMusByte8() {
        var output = this.musDataView.getUint8(this.musDataPosition);
        this.musDataPosition += 1;
        //console.log(output);
        return output;
    }

    convertMusToMidi(musinput)
        {
            // master dataview for input mus
            this.musDataView = new DataView(musinput);
            this.musDataPosition = 0;
    
            console.log('start mus2midi');
            var startTime = Date.now();
    
            
    
            // master data for output midi
            let outputArrayBuffer = new ArrayBuffer(0);
            let outputDataView = new DataView(outputArrayBuffer);
            // Header for the MUS file
            this.musfileheader;
    
            // Descriptor for the current MUS event
            this.eventdescriptor;
            this.channel; // Channel number
            this.mus_event;
    
    
            // Bunch of vars read from MUS lump
            this.key;
            this.controllernumber;
            this.controllervalue;
    
            // Buffer used for MIDI track size record
            this.tracksizebuffer = [];
    
            // Flag for when the score end marker is hit.
            this.hitscoreend = 0;
    
            // Temp working byte
            this.working;
            // Used in building up time delays
            this.timedelay;
    
            // Initialise channel map to mark all channels as unused.
            for (this.channel=0; this.channel<this.NUM_CHANNELS; ++this.channel)
            {
                this.channel_map[this.channel] = -1;
            }
    
            // Grab the header
            this.musfileheader = this.readMusHeader(this.musDataView);
            // Check MUS header
            if (this.musfileheader.id[0] != 'M'.charCodeAt(0) || this.musfileheader.id[1] != 'U'.charCodeAt(0)
                || this.musfileheader.id[2] != 'S'.charCodeAt(0) || this.musfileheader.id[3] != 0x1A)
            {
                console.log("mus header fail");
                return false;
            }
    
            // Seek to where the data is held
            this.musDataPosition = this.musfileheader.scorestart;
            // So, we can assume the MUS file is faintly legit. Let's start writing MIDI data...
    
            this.writeMidiHeader();
            this.tracksize = 0;
    
            // Now, process the MUS file:
            while (this.hitscoreend == 0)
            {
                // Handle a block of events:
    
                while (this.hitscoreend == 0)
                {
                    // Fetch channel number and event code:
                    this.eventdescriptor = this.getMusByte8();
    
    
                    this.channel = this.getMIDIChannel(this.eventdescriptor & 0x0F);
                    this.mus_event = this.eventdescriptor & 0x70;
                    switch (this.mus_event)
                    {
                        case this.mus_releasekey:
                            //console.log('mus_releasekey');
                            this.key = this.getMusByte8();
    
                            this.writeReleaseKey(this.channel, this.key);
    
                            break;
    
                        case this.mus_presskey:
                            this.key = this.getMusByte8();
    
                            if (this.key & 0x80)
                            {
                                this.channelvelocities[this.channel] = this.getMusByte8();
    
                                this.channelvelocities[this.channel] &= 0x7F;
    
                                //console.log('mus_presskey: '+key+ ' ' + channelvelocities[channel]);
                            } else {
                                //console.log('mus_presskey: '+key);
                            }
    
                            this.writePressKey(this.channel, this.key, this.channelvelocities[this.channel]);
    
                            break;
    
                        case this.mus_pitchwheel:
                            //console.log('mus_pitchwheel');
                            this.key = this.getMusByte8();
    
                            this.writePitchWheel(this.channel, this.key * 64);
    
                            break;
    
                        case this.mus_systemevent:
                            //console.log('mus_systemevent');
                            this.controllernumber = getMusByte8();
    
                            if (this.controllernumber < 10 || this.controllernumber > 14) {
                                console.log('controller number inaccurate 10-14:' + this.controllernumber);
                                return false;
                            }
    
                            this.writeChangeController_Valueless(channel, this.controller_map[this.controllernumber]);
    
                            break;
    
                        case this.mus_changecontroller:
                            this.controllernumber = this.getMusByte8();
                            this.controllervalue = this.getMusByte8();
                            //console.log('mus_changecontroller: ' +controllernumber+' '+controllervalue);
                            if (this.controllernumber == 0)
                            {
                                this.writeChangePatch(this.channel,this.controllervalue);
                            }
                            else
                            {
                                if (this.controllernumber < 1 || this.controllernumber > 9) {
                                    console.log('controller number inaccurate: '+this.controllernumber);
                                    return false;
                                }
    
                                this.writeChangeController_Valued(this.channel, this.controller_map[this.controllernumber], this.controllervalue);
                            }
    
                            break;
    
                        case this.mus_scoreend:
                            //console.log('mus_scoreend');
                            this.hitscoreend = 1;
                            break;
    
                        default:
                            //console.log('eventdescriptor default: '+eventdescriptor + ' ' + (eventdescriptor & 0x80));
                            return false;
                            break;
                    }
                    if ((this.eventdescriptor & 0x80) != 0) {
                        //console.log('delay count');
                        break;
                    }
                }
                // Now we need to read the time code:
                if (this.hitscoreend == 0)
                {
                    //console.log('read time code');
                    this.timedelay = 0;
                    //delayCounter = 0;
                    for (;;)
                    {
                        this.working = this.getMusByte8();
                        //delayCounter += 1;
                        this.timedelay = this.timedelay * 128 + (this.working & 0x7F);
                        if ((this.working & 0x80) == 0)
                            break;
                    }
                    //console.log('delay count: '+delayCounter + ' time delay: ' + timedelay)
                    this.queuedtime += this.timedelay;
                }
            }
            console.log('finish writing');
            console.log('time: ' +(Date.now()-startTime));
            // End of track
            this.writeEndTrack();
    
            this.confirmWrite();
    
            // Write the track size into the stream
            this.outputDataView.setUint8(this.MIDI_TRACKLENGTH_OFS + 0,(this.tracksize >> 24) & 0xff);
            this.outputDataView.setUint8(this.MIDI_TRACKLENGTH_OFS + 1,(this.tracksize >> 16) & 0xff);
            this.outputDataView.setUint8(this.MIDI_TRACKLENGTH_OFS + 2,(this.tracksize >> 8) & 0xff);
            this.outputDataView.setUint8(this.MIDI_TRACKLENGTH_OFS + 3,this.tracksize & 0xff);
    
            return this.outputDataView.buffer;
        }

    writeMidiHeader(){
        var midiHeaderData = ['M'.charCodeAt(0), 'T'.charCodeAt(0), 'h'.charCodeAt(0), 'd'.charCodeAt(0), // Main header
                              0x00, 0x00, 0x00, 0x06, // Header size
                              0x00, 0x00, // MIDI type (0)
                              0x00, 0x01, // Number of tracks
                              0x00, 0x46, // Resolution
                              'M'.charCodeAt(0), 'T'.charCodeAt(0), 'r'.charCodeAt(0), 'k'.charCodeAt(0), // Start of track
                              0x00, 0x00, 0x00, 0x00 // Placeholder for track length
        ];

        this.writeData(midiHeaderData);
    }
    
    confirmWrite() {
        var newBuffer = new ArrayBuffer(this.dataToWrite.length);
        this.outputDataView = new DataView(newBuffer);
        // Then write the data
        for (var i = 0; i < this.dataToWrite.length; i++) {
            this.outputDataView.setUint8(this.position,this.dataToWrite[i]);
            this.position += 1;
        }
    }

    writeData(bytes) {
        this.dataToWrite = this.dataToWrite.concat(bytes);
    }

    // Write timestamp to a MIDI file.
    writeTime(time)
        {
            var buffer = time & 0x7F;
            var writeval;
    
            while ((time >>= 7) != 0)
            {
                buffer <<= 8;
                buffer |= ((time & 0x7F) | 0x80);
            }
    
            for (;;)
            {
                writeval = (buffer & 0xFF);
    
                this.writeData([writeval]);
    
                this.tracksize += 1;
    
                if ((buffer & 0x80) != 0)
                    buffer >>= 8;
                else
                {
                    this.queuedtime = 0;
                    return;
                }
            }
        }

        // Write the end of track marker
        writeEndTrack()
        {
            let endtrack = [0xFF, 0x2F, 0x00];
    
            this.writeTime(this.queuedtime);
    
            this.writeData(endtrack);
    
            this.tracksize += 3;
        }

        // Write a key press event
        writePressKey(channel, key, velocity)
        {
            // Write queued time
            this.writeTime(this.queuedtime);
    
            // Write pressed key and channel
            var working = this.midi_presskey | channel;
            this.writeData([working]);
    
            // Write key
            working = key & 0x7F;
            this.writeData([working]);
    
            // Wite velocity
            working = velocity & 0x7F;
            this.writeData([working]);
    
            this.tracksize += 3;
        }

        // Write a key release event
        writeReleaseKey(channel, key)
        {
    
            // Write queued time
            this.writeTime(this.queuedtime);
    
            // Write released key
            var working = this.midi_releasekey | channel;
            this.writeData([working]);
    
            // Write key
            working = key & 0x7F;
            this.writeData([working]);
    
            // Dummy
            working = 0;
            this.writeData([working]);
    
            this.tracksize += 3;
        }

        // Write a pitch wheel/bend event
        writePitchWheel(channel, wheel)
        {
            // Write queued time
            this.writeTime(this.queuedtime);
    
            var working = this.midi_pitchwheel | channel;
            this.writeData([working]);
    
            working = wheel & 0x7F;
            this.writeData([working]);
    
            working = (wheel >> 7) & 0x7F;
            this.writeData([working]);
    
            this.tracksize += 3;
        }

        // Write a patch change event
        writeChangePatch(channel, patch)
        {
            // Write queued time
            this.writeTime(this.queuedtime);
    
            var working = this.midi_changepatch | channel;
            this.writeData([working]);
    
            working = patch & 0x7F;
            this.writeData([working]);
    
            this.tracksize += 2;
        }

        // Write a valued controller change event
        writeChangeController_Valued(channel, control, value)
        {
            // Write queued time
            this.writeTime(this.queuedtime);
    
            var working = this.midi_changecontroller | channel;
            this.writeData([working]);
    
            working = control & 0x7F;
            this.writeData([working]);
    
            // Quirk in vanilla DOOM? MUS controller values should be 7-bit, not 8-bit.
            working = value & 0x80 ? 0x7F : value;
            this.writeData([working]);
    
            this.tracksize += 3;
        }

        // Write a valueless controller change event
        writeChangeController_Valueless(channel, control)
        {
            this.writeChangeController_Valued(channel, control, 0);
        }

        // Allocate a free MIDI channel.
        allocateMIDIChannel()
        {
            var result;
            var max;
            var i;
    
            // Find the current highest-allocated channel.
    
            max = -1;
    
            for (i=0; i<this.NUM_CHANNELS; ++i)
            {
                if (this.channel_map[i] > max)
                {
                    max = this.channel_map[i];
                }
            }
    
            // max is now equal to the highest-allocated MIDI channel.  We can
            // now allocate the next available channel.  This also works if
            // no channels are currently allocated (max=-1)
    
            result = max + 1;
    
            // Don't allocate the MIDI percussion channel!
    
            if (result == this.MIDI_PERCUSSION_CHAN)
            {
                ++result;
            }
    
            return result;
        }

        // Given a MUS channel number, get the MIDI channel number to use in the outputted file.
        getMIDIChannel(mus_channel)
        {
            // Find the MIDI channel to use for this MUS channel.
            // MUS channel 15 is the percusssion channel.
    
            if (mus_channel == this.MUS_PERCUSSION_CHAN)
            {
                return this.MIDI_PERCUSSION_CHAN;
            }
            else
            {
                // If a MIDI channel hasn't been allocated for this MUS channel
                // yet, allocate the next free MIDI channel.
    
                if (this.channel_map[mus_channel] == -1)
                {
                    this.channel_map[mus_channel] = this.allocateMIDIChannel();
                }
    
                return this.channel_map[mus_channel];
            }
        }

        readMusHeader(dataView)
        {
            var output = Object.create(this.musheader);
    
            for (var i = 0; i < 4; i++) {
                output.id.push(dataView.getUint8(i));
            }
            output.scorelength = dataView.getUint16(4,true);
            output.scorestart = dataView.getUint16(6,true);
            output.primarychannels = dataView.getUint16(8,true);
            output.secondarychannels = dataView.getUint16(10,true);
            output.instrumentcount = dataView.getUint16(12,true);
    
            return output;
        }
}

module.exports = Mus2midi;
