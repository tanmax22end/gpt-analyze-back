const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const cors = require('cors');
const mongoose = require('mongoose');
const todoRoutes = express.Router();
const PORT = 4000;
let Todo = require('./link_model');
let Trans = require('./transcript_model');
const fs = require('fs');
const ytdl = require('ytdl-core');
const { Configuration, OpenAIApi } = require("openai");
const { google } = require('googleapis');
const { PassThrough } = require('stream');

// console.log(google);

app.use(cors());
app.use(bodyParser.json());

app.use('/youtube_links', todoRoutes);

mongoose.connect('mongodb://127.0.0.1:27017/youtube_links', { useNewUrlParser: true });
const connection = mongoose.connection;

connection.once('open', function () {
    console.log("MongoDB database connection established successfully");
})

app.listen(PORT, function () {
    console.log("Server is running on Port: " + PORT);
});


todoRoutes.route('/add').post(async function (req, res) {
    try {
        let todo = new Todo(req.body);
        await todo.save();
        console.log(req.body);

        const videoStream = ytdl(req.body.link_description);
        const videoFilename = 'video.mp4';
        const videoFile = fs.createWriteStream(videoFilename);
        videoStream.pipe(videoFile);

        videoFile.on('finish', async () => {
            console.log('Video downloaded successfully');

            // Step 2: Transcribe the video using the OpenAI AP

            const configuration = new Configuration({
                apiKey: process.env.API_KEY,
            });
            const openai = new OpenAIApi(configuration);

            try {

                const completion = await openai.createTranscription(
                    fs.createReadStream("video.mp4"),
                    "whisper-1"
                );
                console.log(completion.data);
                const summary = await openai.createChatCompletion({
                    model: "gpt-3.5-turbo",
                    messages: [{ role: "user", content: completion.data.text + "can you extract all the necessary information from the above mentioned text and represent it in the form of bulleted points" }],
                });
                //   console.log(summary.data.choices[0].message);
                let trans = new Trans({ role: req.body.video_id, content: summary.data.choices[0].message.content });
                try {
                    const savedTrans = await trans.save();
                    console.log("Data saved successfully");
                    console.log(savedTrans);
                    res.status(200).json({ 'todo': 'todo added successfully' }); // send response only if data is saved successfully
                } catch (error) {
                    console.log("Error saving data to database:", error);
                    res.status(400).send('adding new todo failed');
                }
            } catch (err) {
                console.error("Error transcribing video:", err);
                res.status(400).send('adding new todo failed');
            }
        });
    } catch (err) {
        console.error("Error adding new todo:", err);
        res.status(400).send('adding new todo failed');
    }
});


todoRoutes.route('/:id').get(async function (req, res) {
    try {
        let link = req.params.id;
        console.log(req.params.id);
        const todo = await Trans.findOne({ role: link }).exec();
        if (todo) {
            res.json(todo.content);
        } else {
            res.status(404).send("Transcription not found.");
        }
    } catch (err) {
        console.error("Error fetching transcription:", err);
        res.status(500).send("Internal server error.");
    }
});
