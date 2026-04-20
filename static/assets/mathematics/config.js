self.__uv$config = {
  prefix: "/a/",
  bare: "https://bare.benroxy.com/",
  encodeUrl: Ultraviolet.codec.xor.encode,
  decodeUrl: Ultraviolet.codec.xor.decode,

  handler: "/assets/mathematics/handler.js",
  bundle: "/assets/mathematics/bundle.js",
  config: "/assets/mathematics/config.js",
  sw: "/assets/mathematics/sw.js",
};
