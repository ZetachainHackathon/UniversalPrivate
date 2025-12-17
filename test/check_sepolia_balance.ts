import { getSepoliaWallet } from "./wallet";
import { formatEther } from "ethers";

const main = async () => {
  const { provider, wallet } = getSepoliaWallet();
  console.log("Checking Sepolia Balance for address:", wallet.address);
  
  try {
    const balance = await provider.getBalance(wallet.address);
    console.log("Balance:", balance.toString(), "wei");
    console.log("Balance:", formatEther(balance), "ETH");
  } catch (error) {
    console.error("Error fetching balance:", error);
  }
};

main();