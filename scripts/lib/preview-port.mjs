import net from "node:net";

const canListen = (port) =>
  new Promise((resolve) => {
    const server = net.createServer();

    server.once("error", () => {
      resolve(false);
    });
    server.once("listening", () => {
      server.close(() => resolve(true));
    });

    server.listen(port, "127.0.0.1");
  });

export const resolvePreviewPort = async (preferredPort = 4173) => {
  if (await canListen(preferredPort)) {
    return preferredPort;
  }

  return new Promise((resolve, reject) => {
    const server = net.createServer();

    server.once("error", reject);
    server.once("listening", () => {
      const address = server.address();
      server.close(() => {
        if (address && typeof address === "object") {
          resolve(address.port);
          return;
        }

        reject(new Error("Unable to determine an available preview port."));
      });
    });

    server.listen(0, "127.0.0.1");
  });
};
