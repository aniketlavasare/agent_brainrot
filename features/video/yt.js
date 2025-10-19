const dotenv = require("dotenv");
const { google } = require("googleapis"); // Import googleapis package
dotenv.config();

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const youtube = google.youtube({ version: "v3", auth: YOUTUBE_API_KEY });

// Function to search YouTube
async function searchYouTube(topic) {
    try {
        const response = await youtube.search.list({
            part: "snippet",
            q: topic, // Search query from user input
            maxResults: 5,
            type: "video",
        });

        // Corrected URL interpolation and return response
        return response.data.items.map((item) => ({
            title: item.snippet.title,
            url: `https://www.youtube.com/watch?v=${item.id.videoId}`, // Use template literal with backticks
        }));
    } catch (error) {
        console.error("Error fetching YouTube videos:", error);
        return [];
    }
}