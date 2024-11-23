import cors from "cors";
import { config } from "dotenv";
import express, { RequestHandler } from "express";
import FormData from "form-data";
import multer from "multer";
import fetch from "node-fetch";

config();

const app = express();
const upload = multer();

app.use(cors());
app.use(express.json());

const transcribeHandler: RequestHandler = async (req, res) => {
  try {
    if (!req.file) {
      console.log("No file received");
      res.status(400).json({ error: "No audio file provided" });
      return;
    }

    console.log("File received:", req.file.mimetype, req.file.size);

    const formData = new FormData();
    formData.append("file", Buffer.from(req.file.buffer), {
      filename: "audio.webm",
      contentType: req.file.mimetype,
    });
    formData.append("model", "whisper-1");
    console.log("Sending request to OpenAI with formData:", {
      model: "whisper-1", // FormData.get() not available, using known value
      fileSize: req.file.size,
    });

    const response = await fetch(
      "https://api.openai.com/v1/audio/transcriptions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: formData,
      }
    );

    const data = await response.json();
    console.log("OpenAI response:", data);
    res.json(data);
  } catch (error) {
    console.error("Transcription error:", error);
    res.status(500).json({ error: "Transcription failed" });
  }
};

app.post("/api/transcribe", upload.single("audio"), transcribeHandler);

app.listen(3000, () => {
  console.log("Server running on port 3000");
});
