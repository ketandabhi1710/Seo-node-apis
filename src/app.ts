import express, { Response } from "express";
import cors from "cors";
import axios from "axios";
import bodyParser from "body-parser";
const http = require("http");
const socketIo = require("socket.io");
const app = express();
const port = 8000;
app.use(cors());
const server = http.createServer(app);
const io = socketIo(server);

io.on("connection", (socket) => {
  console.log("A client connected");

  socket.on("someEventFromClient", (data) => {
    console.log("Received data from client:", data);
  });

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
    console.log("Seo :: Request payload size:", contentLength, "bytes");
    const { baseurl, username, password, timeInterval, dataArray } = req.body;
    await sendApiRequest(0, dataArray, {
      baseurl,
      username,
      password,
      timeInterval,
    });
    console.log(
      "Seo :: req.body :: ",
      baseurl,
      username,
      password,
      timeInterval
    );
    res.end();
    // res.send({ done: "done" });
  } catch (error) {
    console.log(error);
  }
});

app.post("/dynamic-post-publish-oncostore", async (req: any, res: Response) => {
  try {
    const contentLength = req.get("Content-Length");
    console.log("Request payload size:: oncostore :: ", contentLength, "bytes");
    const { baseurl, username, password, timeInterval, dataArray } = req.body;
    console.log(
      "dynamic-post-publish-oncostore :: oncoStore :: req.body :: creds",
      baseurl,
      username,
      password,
      timeInterval
    );
    await sendApiRequestOncoStore(0, dataArray, {
      baseurl,
      username,
      password,
      timeInterval,
    }).then(() => {
      console.log("request execution complete :: OncoStore ");
      res.end();
    });
  } catch (error) {
    console.log("Error :: Something went Wrong :: OncoStore :: ", error);
  }
});

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

const sendApiRequest = async (index?: any, data?: any, credentials?: any) => {
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
    console.log("currentItem :: ", currentItem);
    const resApiKeysIncludes = Object.keys(currentItem).filter(
      (key) => !["Id", "isChecked", ...validHeaders].includes(key)
    );

    console.log("resApiKeysIncludes :: ", resApiKeysIncludes);
    console.log("updatedObj :: ", updatedObj);
    let mergedObject = {};
    if (resApiKeysIncludes.length > 0) {
      const finalobj = resApiKeysIncludes.map((E: any) => {
        return {
          ...updatedObj,
          acf: { [E]: currentItem[E] },
        };
      });
      console.log("finalobj :: ", finalobj);

      mergedObject = finalobj.reduce((accumulator: any, currentValue: any) => {
        for (const key in currentValue) {
          if (key === "acf") {
            accumulator[key] = { ...accumulator[key], ...currentValue[key] };
          } else if (key === "categories") {
            accumulator[key] = [parseInt(currentValue[key])];
          } else {
            accumulator[key] = currentValue[key];
          }
        }
        return accumulator;
      }, {});
    } else {
      mergedObject = { ...updatedObj };
    }

    console.log("mergedObject :: ", mergedObject);

    console.log("Seo :: url :: username ::, password ", url);
    try {
      const response = await axios.post(url, mergedObject, {
        auth: { username, password },
        headers: {
          "Content-Type": "application/json",
        },
      });
      console.log("Seo :: response.data :: ", response.data);
      console.log("Seo :: post :: Response Obj:: ", {
        id: response.data.id,
        title: response.data.title.rendered,
        status: response.data.status,
      });
      io.emit("postPublishedSeo", {
        id: response.data.id,
        title: response.data.title.rendered,
        status: response.data.status,
      });
    } catch (error) {
      console.log("error :: in if ::", Object.keys(error), error.response.data);
    }
    setTimeout(() => {
      console.log("in timeout :: Seo :: index", index);
      sendApiRequest(index + 1, dataArray, credentials);
    }, timeInterval * 1000);
  }
};

const sendApiRequestOncoStore = async (
  index?: any,
  data?: any,
  credentials?: any
) => {
  const dataArray: any = data.filter((item: any) => {
    return item.isChecked === true;
  });

  let url: any;
  const { username, password, baseurl, timeInterval } = credentials;
  console.log("index, dataArray.length :: OncoStore", index, dataArray.length);
  if (index < dataArray.length) {
    const currentItem: any = dataArray[index];
    url = `${baseurl}/wp-json/wp/v2/posts`;

    console.log("currentItem :: OncoStore ", currentItem);
    console.log("url :: OncoStore ", url);
    try {
      const response = await axios.post(`${url}`, currentItem, {
        auth: { username, password },
        headers: {
          "Content-Type": "application/json",
        },
      });

      console.log("response.data :: Oncostore ", response.data);

      console.log("oncoStore :: post :: Response Obj:: ", {
        id: response.data.post_id,
        title: response.data.message,
        status: response.data.status,
      });

      io.emit("postPublishedOncoStore", {
        id: response.data.post_id,
        title: response.data.message,
        status: response.data.status,
      });
    } catch (error) {
      console.log("error :: in if ::", error);
    }
    setTimeout(() => {
      console.log("in timeout :: oncostore :: index", index);
      sendApiRequestOncoStore(index + 1, dataArray, credentials);
    }, timeInterval * 1000);
  }
};
