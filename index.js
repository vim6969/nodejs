const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const axios = require("axios");
const fs = require("fs");
const puppeteer = require("puppeteer");
const chromium = require("chrome-aws-lambda");

const app = express();

//middleware
app.use(bodyParser.json());
app.use(cors());

//intial get response
app.get("/", (req, res) => {
  res.send("hello from insta-server");
});

//handle post request
app.post("/download-reels", async (req, res) => {
  const { link } = req.body;
  console.log("link received from client:", link);
  //use puppeteer here once the link is received
  try {
    const browser = await puppeteer.launch({
      executablePath: await chromium.executablePath,
      args: chromium.args,
      headless: chromium.headless,
    });
    
    const page = await browser.newPage();
    await page.goto(link);
    //wait for the video element to appear on the page
    await page.waitForSelector("video");
    //extract the video url from the video selector
    const videoURL = await page.evaluate(() => {
      const videoElement = document.querySelector("video");
      return videoElement.getAttribute("src");
    });
    console.log("video url:", videoURL);
    //use axios to downalod the video
    if (videoURL) {
      const response = await axios.get(videoURL, { responseType: "stream" });
      const videoFileName = "downloaded_video.mp4";
      const fileStream = fs.createWriteStream(videoFileName);
      //save the video to a file
      response.data.pipe(fileStream);
      // now listening for the file to finish downloading before sending it to client
      fileStream.on("finish", () => {
        console.log("video downloaded");
        //set the response headers
        res.setHeader(
          "Content-Disposition",
          "attachment; filename=downloaded_video.mp4"
        );
        res.setHeader("Content-Type", "video/mp4");
        // Stream the video file to the client as a response
        // client will read the fileStream
        const readStream = fs.createReadStream(videoFileName);
        readStream.pipe(res);
      });
    } else {
      console.error("video url not found");
      res.status(404).json({ error: "Video URL not found" });
    }
    await browser.close();
  } catch (error) {
    console.error("error:", error);
    res
      .status(500)
      .json({ error: "an error occured while downloading the video" });
    return;
  }
  // res.json({message: 'video downlaoded successfully'})
});
// listen to the server
app.listen(8080, () => {
  console.log("server is running on port 8080");
});
