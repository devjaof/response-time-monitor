const { once } = require("events");
const { createServer } = require("http");
const { randomUUID } = require("crypto");
const { Route, ResponseTimeTracker } = require("./Decorators");

const Db = new Map();

class Server {
  @ResponseTimeTracker // o reponsetime é injetado antes pois ele altera a response data
  @Route
  static async handler(req, res) {
    if (req.method === "POST") {
      const data = await once(req, "data");
      const item = JSON.parse(data);

      item.id = randomUUID();

      Db.set(item.id, item);

      return {
        statusCode: 201,
        message: item,
      };
    }

    return {
      statusCode: 200,
      message: [...Db.values()],
    };
  }
}

createServer(Server.handler).listen(3000, () =>
  console.log("Server running at http://localhost:3000")
);
