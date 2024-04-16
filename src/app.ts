import express, { Response } from "express";
import cors from "cors";
import axios from "axios";
import bodyParser from "body-parser";
const http = require("http");
const socketIo = require("socket.io");
const app = express();
const port = 8000;
app.use(cors());
const server = http.createServer(app); ``
const io = socketIo(server);

io.on("connection", (socket) => {
  console.log("A client connected");

  // Example: You can listen for events from the frontend if needed
  socket.on("someEventFromClient", (data) => {
    console.log("Received data from client:", data);
  });

  socket.on('a', (msg: any) => {
    console.log('a :: msg ::', msg)
  })

  // Handle disconnection
  socket.on("disconnect", () => {
    console.log("Client disconnected");
  });
});

app.use(express.json({ limit: "50mb" }));
app.use(bodyParser.json({ limit: "50mb" }));
app.use(
  express.urlencoded({ limit: "50mb", extended: true, parameterLimit: 50000 })
);

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.post("/dynamic-post-publish", async (req: any, res: Response) => {
  try {
    const contentLength = req.get("Content-Length");
    console.log("Request payload size:", contentLength, "bytes");
    const { baseurl, username, password, timeInterval, dataArray } = req.body;
    await sendApiRequest(
      0,
      dataArray,
      {
        baseurl,
        username,
        password,
        timeInterval,
      },
      res
    );
    console.log("req.body :: ", baseurl, username, password, timeInterval);
    res.end();
    // res.send({ done: "done" });
  } catch (error) {
    console.log(error);
  }
});

app.post('/dynamic-post-publish-oncostore', async (req: any, res: Response) => {
  try {
    const contentLength = req.get("Content-Length");
    console.log("Request payload size:: oncostore :: ", contentLength, "bytes");
    const { baseurl, username, password, timeInterval, dataArray } = req.body;
    await sendApiRequestOncoStore(
      0,
      dataArray,
      {
        baseurl,
        username,
        password,
        timeInterval,
      },
      res
    );
    console.log("oncoStore :: req.body :: ", baseurl, username, password, timeInterval);
    res.end();
  } catch (error) {
    console.log(error, '-asd-fadsf', error.response.data.data)
  }
})

// app.listen(port, () => {
//   console.log(`Express is listening at http://localhost:${port}`);
// });

server.listen(port, () => console.log(`Listening on port ${port}`));

const validHeaders = [
  "date",
  "date_gmt",
  "guid",
  "id",
  "link",
  "modified",
  "modified_gmt",
  "slug",
  "status",
  "type",
  "password",
  "permalink_template",
  "generated_slug",
  "title",
  "content",
  "author",
  "excerpt",
  "featured_media",
  "comment_status",
  "ping_status",
  "format",
  "meta",
  "sticky",
  "template",
  "categories",
  "tags",
];

const sendApiRequest = async (
  index?: any,
  data?: any,
  credentials?: any,
  res?: Response
) => {
  const dataArray: any = data.filter((item: any) => {
    return item.isChecked === true;
  });
  const { username, password, baseurl, timeInterval } = credentials;

  let url: any;
  if (index < dataArray.length) {
    const currentItem: any = dataArray[index];
    if (currentItem.hasOwnProperty("post_type")) {
      url = `${baseurl}/wp-json/wp/v2/${currentItem["post_type"]}`;
    } else {
      url = `${baseurl}/wp-json/wp/v2/posts`;
    }
    const updatedObj: any = {};
    validHeaders.forEach((header) => {
      if (currentItem.hasOwnProperty(header)) {
        if (currentItem[header] === "categories") {
          updatedObj[header] = [parseInt(currentItem[header])];
        } else {
          updatedObj[header] = currentItem[header];
        }
      }
    });

    const resApiKeysIncludes = Object.keys(currentItem).filter(
      (key) => !["Id", "isChecked", ...validHeaders].includes(key)
    );

    const finalobj = resApiKeysIncludes.map((E: any) => {

      return {
        ...updatedObj,
        acf: { [E]: currentItem[E] },
      };
    });

    const mergedObject = finalobj.reduce(
      (accumulator: any, currentValue: any) => {
        for (const key in currentValue) {
          if (key === "acf") {
            accumulator[key] = { ...accumulator[key], ...currentValue[key] };
          } else if (key === 'categories') {
            accumulator[key] = [parseInt(currentValue[key])];
          } else {
            accumulator[key] = currentValue[key];
          }
        }
        return accumulator;
      },
      {}
    );

    console.log('mergedObject :: ', mergedObject)
    const response = await axios.post(url, mergedObject, {
      auth: { username, password },
      headers: {
        "Content-Type": "application/json",
      },
    });
    console.log('response.data :: ', response.data)
    // console.log({
    //   id: response.data.id,
    //   title: response.data.title.rendered,
    //   status: response.data.status,
    // });
    // io.emit("postPublished", {
    //   id: response.data.id,
    //   title: response.data.title.rendered,
    //   status: response.data.status,
    // });

    // res.write(
    //   JSON.stringify({
    //     id: response.data.id,
    //     title: response.data.title.rendered,
    //     status: response.data.status,
    //     slug: response.data.slug,
    //     message: "Post published successfully",
    //   })
    // );
    setTimeout(() => {
      sendApiRequest(index + 1, data, credentials, res);
    }, timeInterval * 1000);
    // .then((response) => {

    //   // eventEmitter.emit(
    //   //   "postPublished",
    //   //   {
    //   //     id: response.data.id,
    //   //     title: response.data.title.rendered,
    //   //     status: response.data.status,
    //   //     slug: response.data.slug,
    //   //     message: "Post published successfully",
    //   //   },
    //   //   res
    //   // );

    // });
  }
};

const sendApiRequestOncoStore = async (index?: any,
  data?: any,
  credentials?: any,
  res?: Response) => {
  const dataArray: any = data.filter((item: any) => {
    return item.isChecked === true;
  });

  let url: any
  const { username, password, baseurl, timeInterval } = credentials;
  console.log('oncoStore :: index', index, dataArray.length, dataArray)
  if (index <= dataArray.length) {
    const currentItem: any = dataArray[index];
    url = `${baseurl}/wp-json/wp/v2/posts`;

    console.log('currentItem :: ',currentItem)
    const response = await axios
      .post(`${url}`, currentItem, {
        auth: { username, password },
        headers: {
          "Content-Type": "application/json",
        },
      })
    console.log('oncoStore :: post :: Response :: ', {
      id: response.data.id,
      title: response.data.title.rendered,
      status: response.data.status,
    });


    io.emit("postPublishedOncoStore", {
      id: response.data.id,
      title: response.data.title.rendered,
      status: response.data.status,
    });

    setTimeout(() => {
      sendApiRequestOncoStore(index + 1, data, credentials, res);
    }, timeInterval * 1000);
  }
};
