const { randomUUID } = require("crypto");

const UI_DISABLED = process.env.UI_DISABLED;

let ui;
if (UI_DISABLED) {
  ui = { updateGraph: () => {} };
} else {
  const Ui = require("./Ui");
  ui = new Ui();
}

const log = (...args) => {
  if (UI_DISABLED) {
    console.log(...args);
  }
};

const OnRequestEnded = ({ data, res, reqStartedAt }) => {
  return () => {
    const reqEndedAt = performance.now();
    let timeDiff = reqEndedAt - reqStartedAt;
    let seconds = Math.round(timeDiff);

    data.statusCode = res.statusCode;
    data.statusMessage = res.statusMessage;
    data.elapsed = timeDiff.toFixed(2).concat("ms");
    log("benchmark: ", data);

    ui.updateGraph(data.method, seconds);
  };
};

const Route = (target, { kind, name }) => {
  try {
    if (kind !== "method") {
      // se não é um method então é uma função ou uma propriedade: target
      return target;
    }

    return async (req, res) => {
      const { statusCode, message } = await target.apply(this, [req, res]);

      res.writeHead(statusCode);
      res.end(JSON.stringify(message));
      return;
    };
  } catch (error) {
    console.error(error);
  }
};

const ResponseTimeTracker = (target, { kind, name }) => {
  // só funciona em async functions

  try {
    if (kind !== "method") {
      // se não é um method então é uma função ou uma propriedade: target
      return target;
    }

    return (req, res) => {
      const reqId = randomUUID();
      const reqStartedAt = performance.now();

      // promise que não foi terminada ainda e será usada para metrificar
      const afterExec = target.apply(this, [req, res]);

      const data = {
        reqId,
        name,
        method: req.method,
        url: req.url,
      };

      const onFinally = OnRequestEnded({
        data,
        res,
        reqStartedAt,
      });

      afterExec.finally(onFinally);
      return afterExec;
    };
  } catch (error) {
    console.error(error);
  }
};

module.exports = {
  Route,
  ResponseTimeTracker,
};
