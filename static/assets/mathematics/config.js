self.__uv$config = {
  prefix: "/a/",
  // Adding /bare/ ensures Ultraviolet talks to the correct API endpoint
  bare: "https://focus-bare-xi.vercel.app/bare/", 
  encodeUrl: Ultraviolet.codec.xor.encode,
  decodeUrl: Ultraviolet.codec.xor.decode,

  handler: "/assets/mathematics/handler.js",
  bundle: "/assets/mathematics/bundle.js",
  config: "/assets/mathematics/config.js",
  sw: "/assets/mathematics/sw.js",
};
