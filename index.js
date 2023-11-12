const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const axios = require("axios");
// const fs = require("fs");
const puppeteer = require("puppeteer");
// const chromium = require("chrome-aws-lambda");

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
      args: ['--no-sandbox','--disable-setuid-sandbox'],
      ignoreDefaultArgs:['--disable-extensions'],
     });
    // 
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
    // close the browser
    await browser.close();
    // set the content disposition to trigger download
    res.setHeader("Content-Disposition","attachment; filename=downloaded_reel.mp4")
    res.setHeader("Content-Type", "video/mp4");
    // using axis to directly stream the data to the client
    const response = await axios.get(videoURL, { responseType: "stream" });
    response.data.pipe(res)
  } catch (error) {
    console.error("error:", error);
    res
      .status(500)
      .json({ error: "an error occured while downloading the video" });
    return;
  }
});
// listen to the server
app.listen(8080, () => {
  console.log("server is running on port 8080");
});
