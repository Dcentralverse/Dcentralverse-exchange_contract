const mumbai = {
  royaltiesProviderProxy: "",
  wrappedNativeToken: "0x9c3C9283D3e44854697Cd22D3Faa240Cfb032889",
  dcvExchangeProxy: "",
};

const sepolia = {
  royaltiesProviderProxy: "",
  wrappedNativeToken: "0xf531b8f309be94191af87605cfbf600d71c2cfe0",
  dcvExchangeProxy: "",
};

const polygon = {
  royaltiesProviderProxy: "",
  wrappedNativeToken: "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270",
  dcvExchangeProxy: "",
};

const ethereum = {
  royaltiesProviderProxy: "",
  wrappedNativeToken: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
  dcvExchangeProxy: "",
};

const networks = {
  mumbai,
  sepolia,
  polygon,
  ethereum,
};

const getForNetwork = (network) => networks[network];

exports.getForNetwork = getForNetwork;
