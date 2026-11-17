globalThis.fetch = async () => {
  throw new Error("Unexpected network request before argument validation");
};
