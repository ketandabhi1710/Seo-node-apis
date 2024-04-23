import express, { NextFunction, Request, Response, response } from "express";
import cors from "cors";
import axios from "axios";
import bodyParser from "body-parser";
import mongoose from "mongoose";
const uuid = require("uuid");
const http = require("http");
const socketIo = require("socket.io");
const app = express();
const port = 8000;
let requestMap = {}; // Map to store request identifiers and their corresponding response objects
app.use(cors());
const server = http.createServer(app);
const io = socketIo(server);
import CredentialModel from "./Models/CredentialsModel";

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

// app.use((req: any, res: any, next: NextFunction) => {
//   const requestId = uuid.v4(); // Generate a unique request identifier
//   requestMap[requestId] = {
//     method: req.method,
//     url: req.url,
//     timestamp: new Date().toISOString(),
//   }; // Store request details with the identifier
//   req.requestId = requestId; // Attach the identifier to the request object

//   // Function to remove request from the map after completion
//   res.on("finish", () => {
//     delete requestMap[requestId]; // Remove the request from the map after completion
//   });
//   next();

// setTimeout(() => {
//   // Introduce a delay of 2 seconds before proceeding
//   next();
// }, 10000); // Delay of 2000 milliseconds (2 seconds)
// });

const trackRequestsMiddleware = (req, res, next) => {
  const requestId = uuid.v4();
  console.log("Request ID:", requestId );
  requestMap[requestId] = {
    method: req.method,
    url: req.url,
    timestamp: new Date().toISOString(),
  };
  req.requestId = requestId;

  // Function to remove request from the map after completion
  res.on("finish", () => {
    delete requestMap[requestId]; // Remove the request from the map after completion
    console.log("requestMap :: ", requestMap);
  });

  setTimeout(() => {
    // Introduce a delay of 10 seconds before proceeding
    next();
  }, 10000); // Delay of 10000 milliseconds (10 seconds)
};

app.get("/", (req, res) => {
  res.send("Hello World!");
});

// app.post("/dynamic-post-publish", async (req: any, res: Response) => {
//   try {
//     const contentLength = req.get("Content-Length");
//     console.log("Request payload size:", contentLength, "bytes");
//     const { baseurl, username, password, timeInterval, dataArray } = req.body;
//     await sendApiRequest(
//       0,
//       dataArray,
//       {
//         baseurl,
//         username,
//         password,
//         timeInterval,
//       },
//       res
//     );
//     console.log("req.body :: ", baseurl, username, password, timeInterval);
//     res.end();
//     // res.send({ done: "done" });
//   } catch (error) {
//     console.log(error);
//   }
// });

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
mongoose
  .connect(
    "mongodb+srv://ketan-dev:cjmpXFtV9ktu9s0a@darshan-yog.sqlqqwk.mongodb.net/"
  )
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.error(err));

app.post("/api/credentials", async (req, res) => {
  try {
    console.log("api :: store :: creds :: req.body", req.body);
    const { username, url, password } = req.body;

    // Create a new credential document
    const newCredential = new CredentialModel({ username, url, password });

    // Save the credential to the database
    await newCredential.save();

    res.status(201).json({ message: "Credential created successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
});

// API endpoint to get all credentials
app.get("/api/credentials", async (req, res) => {
  try {
    const credentials = await CredentialModel.find();
    res.json(credentials);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
});

// Update Credential API
app.put("/api/credentials/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { username, url, password } = req.body;

    // Find the credential by ID and update it
    await CredentialModel.findByIdAndUpdate(id, { username, url, password });

    res.json({ message: "Credential updated successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
});

// Route to fetch published posts from WordPress REST API
app.get("/api/published-posts", trackRequestsMiddleware, async (req, res) => {
  try {
    const response = await axios.get(
      "https://blog.cloudscube.com/wp-json/wp/v2/posts",
      {
        params: {
          // status: "publish", // Filter by published posts
          per_page: 10, // Limit the number of posts to fetch
          // include:[4374]
          // before: new Date(),
        },
      }
    );
    // console.log(response.data)
    const publishedPosts = response.data.map((post) => ({
      id: post.id,
      title: post.title.rendered,
      author: post.author,
      publishedDate: post.date,
    }));
    res.json(publishedPosts);
  } catch (error) {
    console.error("Error fetching published posts:", error);

    res.status(500).json({ message: "Server Error" });
  }
});

// API endpoint to list currently executing requests
app.get("/list-requests", (req, res) => {
  const executingRequests = Object.values(requestMap);
  res.json(executingRequests);
});

// API endpoint to terminate a specific request
app.post("/terminate-request/:requestId", (req, res) => {
  const { requestId } = req.params;
  if (requestMap[requestId]) {
    delete requestMap[requestId]; // Remove the request from the map
    res.send("Request terminated successfully.");
  } else {
    res.status(404).send("Request not found.");
  }
});

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

// const sendApiRequest = async (
//   index?: any,
//   data?: any,
//   credentials?: any,
//   res?: Response
// ) => {
//   const dataArray: any = data.filter((item: any) => {
//     return item.isChecked === true;
//   });
//   const { username, password, baseurl, timeInterval } = credentials;

//   let url: any;
//   if (index < dataArray.length) {
//     const currentItem: any = dataArray[index];
//     if (currentItem.hasOwnProperty("post_type")) {
//       url = `${baseurl}/wp-json/wp/v2/${currentItem["post_type"]}`;
//     } else {
//       url = `${baseurl}/wp-json/wp/v2/posts`;
//     }
//     const updatedObj: any = {};
//     validHeaders.forEach((header) => {
//       if (currentItem.hasOwnProperty(header)) {
//         if (currentItem[header] === "categories") {
//           updatedObj[header] = [parseInt(currentItem[header])];
//         } else {
//           updatedObj[header] = currentItem[header];
//         }
//       }
//     });

//     const resApiKeysIncludes = Object.keys(currentItem).filter(
//       (key) => !["Id", "isChecked", ...validHeaders].includes(key)
//     );

//     const finalobj = resApiKeysIncludes.map((E: any) => {

//       return {
//         ...updatedObj,
//         acf: { [E]: currentItem[E] },
//       };
//     });

//     const mergedObject = finalobj.reduce(
//       (accumulator: any, currentValue: any) => {
//         for (const key in currentValue) {
//           if (key === "acf") {
//             accumulator[key] = { ...accumulator[key], ...currentValue[key] };
//           } else if (key === 'categories') {
//             accumulator[key] = [parseInt(currentValue[key])];
//           } else {
//             accumulator[key] = currentValue[key];
//           }
//         }
//         return accumulator;
//       },
//       {}
//     );

//     console.log('mergedObject :: ', mergedObject)
//     const response = await axios.post(url, mergedObject, {
//       auth: { username, password },
//       headers: {
//         "Content-Type": "application/json",
//       },
//     });
//     console.log('response.data :: ', response.data)
//     // console.log({
//     //   id: response.data.id,
//     //   title: response.data.title.rendered,
//     //   status: response.data.status,
//     // });
//     // io.emit("postPublished", {
//     //   id: response.data.id,
//     //   title: response.data.title.rendered,
//     //   status: response.data.status,
//     // });

//     // res.write(
//     //   JSON.stringify({
//     //     id: response.data.id,
//     //     title: response.data.title.rendered,
//     //     status: response.data.status,
//     //     slug: response.data.slug,
//     //     message: "Post published successfully",
//     //   })
//     // );
//     setTimeout(() => {
//       sendApiRequest(index + 1, data, credentials, res);
//     }, timeInterval * 1000);
//     // .then((response) => {

//     //   // eventEmitter.emit(
//     //   //   "postPublished",
//     //   //   {
//     //   //     id: response.data.id,
//     //   //     title: response.data.title.rendered,
//     //   //     status: response.data.status,
//     //   //     slug: response.data.slug,
//     //   //     message: "Post published successfully",
//     //   //   },
//     //   //   res
//     //   // );

//     // });
//   }
// };

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

// mongodb+srv://<username>:<password>@darshan-yog.sqlqqwk.mongodb.net/?retryWrites=true&w=majority&appName=Darshan-yog
// mongodb+srv://ketan-dev:cjmpXFtV9ktu9s0a@darshan-yog.sqlqqwk.mongodb.net/
