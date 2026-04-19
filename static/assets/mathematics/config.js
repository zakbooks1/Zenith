const bareServers = [
  "https://bare.tomp.app/",
  "https://bare.benisland.xyz/",
  "https://bare.toadsworld.org/",
  "https://bare.light-speed.tech/",
  "https://uv.student-portal.workers.dev/"
];

self.__uv$config = {
  prefix: "/a/",
  // Randomly pick an engine from the pool for better reliability
  bare: bareServers[Math.floor(Math.random() * bareServers.length)],
  encodeUrl: Ultraviolet.codec.xor.encode,
  decodeUrl: Ultraviolet.codec.xor.decode,
  handler: "/assets/mathematics/handler.js?v=9-30-2024",
  bundle: "/assets/mathematics/bundle.js?v=9-30-2024",
  config: "/assets/mathematics/config.js?v=9-30-2024",
  sw: "/assets/mathematics/sw.js?v=9-30-2024",
};
