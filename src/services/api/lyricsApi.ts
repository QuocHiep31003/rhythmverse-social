import { API_BASE_URL, buildJsonHeaders } from './config';

// Mock lyrics data for demonstration
const mockLyricsData: Record<string, Array<{ time: number; text: string }>> = {
    "1": [
        { time: 0, text: "♪ Instrumental intro..." },
        { time: 4, text: "In the cosmic dreams we fly..." },
        { time: 8, text: "Lost in stars, just you and I..." },
        { time: 12, text: "Echoes fading through the night..." },
        { time: 16, text: "Guided by the endless light..." },
        { time: 20, text: "We're searching for the answer..." },
        { time: 24, text: "Among the endless stars above..." },
        { time: 28, text: "Floating through the void so deep..." },
        { time: 32, text: "In this cosmic symphony..." },
        { time: 36, text: "♪ Instrumental bridge..." },
        { time: 40, text: "When we finally reach the end..." },
        { time: 44, text: "We'll remember all the friends..." },
        { time: 48, text: "Who shared this journey with us..." },
        { time: 52, text: "In the cosmic wonderland..." },
        { time: 56, text: "♪ Verse 2 begins..." },
        { time: 60, text: "Through the galaxy we roam..." },
        { time: 64, text: "Never feeling quite alone..." },
        { time: 68, text: "Music plays across the space..." },
        { time: 72, text: "Time has left no trace..." },
        { time: 76, text: "♪ Chorus returns..." },
        { time: 80, text: "In the cosmic dreams we fly..." },
        { time: 84, text: "Lost in stars, just you and I..." },
        { time: 88, text: "Echoes fading through the night..." },
        { time: 92, text: "Guided by the endless light..." },
        { time: 96, text: "♪ Bridge section..." },
        { time: 100, text: "Floating weightless in the air..." },
        { time: 104, text: "No need for worry, no need for care..." },
        { time: 108, text: "Just the music and the stars..." },
        { time: 112, text: "Taking us so far..." },
        { time: 116, text: "♪ Instrumental solo..." },
        { time: 120, text: "Reaching for the sky..." },
        { time: 124, text: "Feeling like we can fly..." },
        { time: 128, text: "No limits, no boundaries..." },
        { time: 132, text: "Just you and me..." },
        { time: 136, text: "♪ Final chorus..." },
        { time: 140, text: "In the cosmic dreams we fly..." },
        { time: 144, text: "Lost in stars, just you and I..." },
        { time: 148, text: "Echoes fading through the night..." },
        { time: 152, text: "Guided by the endless light..." },
        { time: 156, text: "Never will we forget this night..." },
        { time: 160, text: "Under the cosmic lights so bright..." },
        { time: 164, text: "♪ Outro..." },
        { time: 168, text: "Dreams will carry us away..." },
        { time: 172, text: "Until we meet another day..." },
    ],
    "2": [
        { time: 0, text: "♪ Intro..." },
        { time: 4, text: "Stellar journey begins tonight..." },
        { time: 8, text: "Across the galaxy we ride..." },
        { time: 12, text: "With music as our guide..." },
        { time: 16, text: "Through darkness and through light..." },
        { time: 20, text: "We'll never lose our way..." },
        { time: 24, text: "♪ Verse continues..." },
        { time: 28, text: "Every star a destination..." },
        { time: 32, text: "Every beat a celebration..." },
        { time: 36, text: "Lost in the rhythm of space..." },
        { time: 40, text: "Finding our special place..." },
        { time: 44, text: "♪ Chorus builds up..." },
        { time: 48, text: "Stellar journey never ends..." },
        { time: 52, text: "With you as my best friend..." },
        { time: 56, text: "Through the cosmos we go..." },
        { time: 60, text: "With the music in our soul..." },
        { time: 64, text: "♪ Instrumental..." },
        { time: 68, text: "Floating past the planets..." },
        { time: 72, text: "Dancing with the comets..." },
        { time: 76, text: "Music guides us through..." },
        { time: 80, text: "Everything feels new..." },
        { time: 84, text: "♪ Bridge..." },
        { time: 88, text: "In this stellar adventure..." },
        { time: 92, text: "We're creating our own chapter..." },
        { time: 96, text: "No looking back, only forward..." },
        { time: 100, text: "To the stars we're soaring..." },
        { time: 104, text: "♪ Final chorus..." },
        { time: 108, text: "Stellar journey begins tonight..." },
        { time: 112, text: "Across the galaxy we ride..." },
        { time: 116, text: "With music as our guide..." },
        { time: 120, text: "We'll never lose our way..." },
        { time: 124, text: "♪ Outro..." },
        { time: 128, text: "Until the journey's end..." },
        { time: 132, text: "Our stellar adventure..." },
    ],
    "3": [
        { time: 0, text: "♪ Intro..." },
        { time: 3, text: "Running through the galaxy..." },
        { time: 7, text: "Faster than the speed of sound..." },
        { time: 11, text: "Galaxy Runner takes the lead..." },
        { time: 15, text: "No one can slow us down..." },
        { time: 19, text: "♪ Melody..." },
        { time: 23, text: "Through nebulas we soar..." },
        { time: 27, text: "Galaxy Runner evermore..." },
        { time: 31, text: "♪ Verse 2..." },
        { time: 35, text: "Leaving trails of light behind..." },
        { time: 39, text: "Breaking through the space and time..." },
        { time: 43, text: "Nothing can stop us now..." },
        { time: 47, text: "We've got the power somehow..." },
        { time: 51, text: "♪ Chorus returns..." },
        { time: 55, text: "Running through the galaxy..." },
        { time: 59, text: "Faster than the speed of sound..." },
        { time: 63, text: "Galaxy Runner takes the lead..." },
        { time: 67, text: "No one can slow us down..." },
        { time: 71, text: "♪ Instrumental solo..." },
        { time: 75, text: "Accelerating through the void..." },
        { time: 79, text: "Everything that we've enjoyed..." },
        { time: 83, text: "Music keeps us moving..." },
        { time: 87, text: "There's no point in stopping..." },
        { time: 91, text: "♪ Bridge section..." },
        { time: 95, text: "Take control of our destiny..." },
        { time: 99, text: "Set our hearts and spirits free..." },
        { time: 103, text: "Running at full speed..." },
        { time: 107, text: "Fulfilling every need..." },
        { time: 111, text: "♪ Final run..." },
        { time: 115, text: "Through nebulas we soar..." },
        { time: 119, text: "Galaxy Runner evermore..." },
        { time: 123, text: "Never stopping, never tired..." },
        { time: 127, text: "Together we're inspired..." },
        { time: 131, text: "♪ Fade out..." },
        { time: 135, text: "Galaxy Runner..." },
        { time: 139, text: "Running evermore..." },
    ],
};

/**
 * Lyrics API - Get synchronized lyrics for a song
 */
export const lyricsApi = {
    /**
     * Get lyrics for a specific song by ID
     * @param songId - The ID of the song
     * @returns Array of { time: number, text: string } objects
     */
    getLyrics: async (songId: string): Promise<Array<{ time: number; text: string }>> => {
        try {
            // Try to fetch from backend
            const response = await fetch(`${API_BASE_URL}/songs/${songId}/lyrics`, {
                method: 'GET',
                headers: buildJsonHeaders(),
            });

            if (response.ok) {
                return await response.json();
            }

            // Fallback to mock data
            console.log(`Lyrics not found for song ${songId}, using mock data`);

            // Return mock data (if exists) or generic mock lyrics for any song
            if (mockLyricsData[songId]) {
                return mockLyricsData[songId];
            }

            // Generic mock lyrics for any song ID (3+ minutes)
            return [
                { time: 0, text: "♪ Music starts playing..." },
                { time: 4, text: "Feel the rhythm and the beat..." },
                { time: 8, text: "Let the melody take control..." },
                { time: 12, text: "Dancing through the night..." },
                { time: 16, text: "Every note tells a story..." },
                { time: 20, text: "Lost in the sound..." },
                { time: 24, text: "Feel the music in your soul..." },
                { time: 28, text: "Let it guide you home..." },
                { time: 32, text: "♪ Enjoying the moment..." },
                { time: 36, text: "Music brings us together..." },
                { time: 40, text: "Never let the music stop..." },
                { time: 44, text: "Raising our hands up high..." },
                { time: 48, text: "Feel the energy rise..." },
                { time: 52, text: "In this moment we're alive..." },
                { time: 56, text: "Every beat makes us move..." },
                { time: 60, text: "Nothing can break this groove..." },
                { time: 64, text: "♪ The chorus comes again..." },
                { time: 68, text: "Singing at the top of our lungs..." },
                { time: 72, text: "This is where we belong..." },
                { time: 76, text: "In the rhythm, in the song..." },
                { time: 80, text: "Feel the bass, feel the drop..." },
                { time: 84, text: "Nothing's gonna make us stop..." },
                { time: 88, text: "♪ Instrumental solo..." },
                { time: 92, text: "Losing ourselves in the sound..." },
                { time: 96, text: "World disappears all around..." },
                { time: 100, text: "Just the beat and the melody..." },
                { time: 104, text: "Setting our hearts free..." },
                { time: 108, text: "Every beat is a heartbeat..." },
                { time: 112, text: "Moving our hands and our feet..." },
                { time: 116, text: "♪ Energy builds up..." },
                { time: 120, text: "Crowd starts jumping up..." },
                { time: 124, text: "This is what we came for..." },
                { time: 128, text: "Can't ask for any more..." },
                { time: 132, text: "Music runs through our veins..." },
                { time: 136, text: "Breaking all the chains..." },
                { time: 140, text: "Dancing like there's no tomorrow..." },
                { time: 144, text: "Leave behind the sorrow..." },
                { time: 148, text: "♪ Bridge section starts..." },
                { time: 152, text: "Take a breath, slow it down..." },
                { time: 156, text: "Feel the vibe all around..." },
                { time: 160, text: "This is more than just a song..." },
                { time: 164, text: "It's where we feel we belong..." },
                { time: 168, text: "Every lyric means something..." },
                { time: 172, text: "To the rhythm we're singing..." },
                { time: 176, text: "♪ Final chorus begins..." },
                { time: 180, text: "Raising our voices high..." },
                { time: 184, text: "Until we touch the sky..." },
                { time: 188, text: "This moment we'll remember..." },
                { time: 192, text: "Long after December..." },
                { time: 196, text: "Music stays in our heart..." },
                { time: 200, text: "Even when we're apart..." },
                { time: 204, text: "♪ Outro fading away..." },
                { time: 208, text: "Taking the beat with us..." },
                { time: 212, text: "Until we meet again..." },
            ];
        } catch (error) {
            console.error("Error fetching lyrics:", error);

            // Return generic mock lyrics (3+ minutes)
            return [
                { time: 0, text: "♪ Music starts playing..." },
                { time: 4, text: "Feel the rhythm and the beat..." },
                { time: 8, text: "Let the melody take control..." },
                { time: 12, text: "Dancing through the night..." },
                { time: 16, text: "Every note tells a story..." },
                { time: 20, text: "Lost in the sound..." },
                { time: 24, text: "Feel the music in your soul..." },
                { time: 28, text: "Let it guide you home..." },
                { time: 32, text: "♪ Enjoying the moment..." },
                { time: 36, text: "Music brings us together..." },
                { time: 40, text: "Never let the music stop..." },
                { time: 44, text: "Raising our hands up high..." },
                { time: 48, text: "Feel the energy rise..." },
                { time: 52, text: "In this moment we're alive..." },
                { time: 56, text: "Every beat makes us move..." },
                { time: 60, text: "Nothing can break this groove..." },
                { time: 64, text: "♪ The chorus comes again..." },
                { time: 68, text: "Singing at the top of our lungs..." },
                { time: 72, text: "This is where we belong..." },
                { time: 76, text: "In the rhythm, in the song..." },
                { time: 80, text: "Feel the bass, feel the drop..." },
                { time: 84, text: "Nothing's gonna make us stop..." },
                { time: 88, text: "♪ Instrumental solo..." },
                { time: 92, text: "Losing ourselves in the sound..." },
                { time: 96, text: "World disappears all around..." },
                { time: 100, text: "Just the beat and the melody..." },
                { time: 104, text: "Setting our hearts free..." },
                { time: 108, text: "Every beat is a heartbeat..." },
                { time: 112, text: "Moving our hands and our feet..." },
                { time: 116, text: "♪ Energy builds up..." },
                { time: 120, text: "Crowd starts jumping up..." },
                { time: 124, text: "This is what we came for..." },
                { time: 128, text: "Can't ask for any more..." },
                { time: 132, text: "Music runs through our veins..." },
                { time: 136, text: "Breaking all the chains..." },
                { time: 140, text: "Dancing like there's no tomorrow..." },
                { time: 144, text: "Leave behind the sorrow..." },
                { time: 148, text: "♪ Bridge section starts..." },
                { time: 152, text: "Take a breath, slow it down..." },
                { time: 156, text: "Feel the vibe all around..." },
                { time: 160, text: "This is more than just a song..." },
                { time: 164, text: "It's where we feel we belong..." },
                { time: 168, text: "Every lyric means something..." },
                { time: 172, text: "To the rhythm we're singing..." },
                { time: 176, text: "♪ Final chorus begins..." },
                { time: 180, text: "Raising our voices high..." },
                { time: 184, text: "Until we touch the sky..." },
                { time: 188, text: "This moment we'll remember..." },
                { time: 192, text: "Long after December..." },
                { time: 196, text: "Music stays in our heart..." },
                { time: 200, text: "Even when we're apart..." },
                { time: 204, text: "♪ Outro fading away..." },
                { time: 208, text: "Taking the beat with us..." },
                { time: 212, text: "Until we meet again..." },
            ];
        }
    },

    /**
     * Save/update lyrics for a song
     * @param songId - The ID of the song
     * @param lyrics - Array of lyric lines with timestamps
     */
    saveLyrics: async (
        songId: string,
        lyrics: Array<{ time: number; text: string }>
    ): Promise<void> => {
        try {
            const response = await fetch(`${API_BASE_URL}/songs/${songId}/lyrics`, {
                method: 'POST',
                headers: buildJsonHeaders(),
                body: JSON.stringify(lyrics),
            });

            if (!response.ok) {
                throw new Error('Failed to save lyrics');
            }
        } catch (error) {
            console.error("Error saving lyrics:", error);
            throw error;
        }
    },

    /**
     * Get mock lyrics data (for testing)
     */
    getMockLyrics: (songId: string): Array<{ time: number; text: string }> => {
        return mockLyricsData[songId] || [
            { time: 0, text: "♪ No lyrics available..." }
        ];
    },
};

