import { useState, useEffect, useCallback } from "react";
import { createPublicClient, createWalletClient, custom, http, formatEther, defineChain } from "viem";
import { mainnet } from "viem/chains";

const abstractTestnet = defineChain({
  id: 11124,
  name: "Abstract Testnet",
  nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: ["https://api.testnet.abs.xyz"] } },
  blockExplorers: { default: { name: "Explorer", url: "https://explorer.testnet.abs.xyz" } },
});

type WalletState = {
  address: `0x${string}`;
  balance: string;
  chainId: number;
};

export default function WalletConnect() {
  const [wallet, setWallet] = useState<WalletState | null>(null);
  const [loading, setLoading] = useState(false);
  const [chain, setChain] = useState<"eth" | "abstract">("eth");
  const [toast, setToast] = useState<{ type: string; message: string } | null>(null);

  const showToast = (type: string, message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  const getClients = useCallback(async (addr: `0x${string}`, ch: typeof mainnet | typeof abstractTestnet) => {
    const publicClient = createPublicClient({
      chain: ch,
      transport: http(),
    });
    const balance = await publicClient.getBalance({ address: addr });
    return { balance: formatEther(balance), publicClient };
  }, []);

  const connect = async () => {
    if (!window.ethereum) {
      showToast("error", "No wallet found. Install MetaMask.");
      return;
    }
    setLoading(true);
    try {
      const [addr] = await window.ethereum.request({ method: "eth_requestAccounts" }) as [`0x${string}`];
      const targetChain = chain === "abstract" ? abstractTestnet : mainnet;
      const { balance } = await getClients(addr, targetChain);
      const chainId = await window.ethereum.request({ method: "eth_chainId" }) as string;
      setWallet({ address: addr, balance, chainId: parseInt(chainId) });
    } catch (e) {
      showToast("error", e instanceof Error ? e.message : "Connection failed");
    } finally {
      setLoading(false);
    }
  };

  const disconnect = () => {
    setWallet(null);
  };

  const switchChain = async (target: "eth" | "abstract") => {
    setChain(target);
    if (!wallet) return;
    const params = target === "abstract"
      ? { chainId: "0x2b74", chainName: "Abstract Testnet", rpcUrls: ["https://api.testnet.abs.xyz"], nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 } }
      : { chainId: "0x1", chainName: "Ethereum Mainnet", rpcUrls: ["https://cloudflare-eth.com"] };
    try {
      await window.ethereum!.request({ method: "wallet_switchEthereumChain", params: [{ chainId: params.chainId }] });
    } catch {
      await window.ethereum!.request({ method: "wallet_addEthereumChain", params: [params] });
    }
    const targetChain = target === "abstract" ? abstractTestnet : mainnet;
    const { balance } = await getClients(wallet.address, targetChain);
    setWallet({ ...wallet, balance });
  };

  const signMessage = async () => {
    if (!wallet) return;
    try {
      const walletClient = createWalletClient({ account: wallet.address, chain: mainnet, transport: custom(window.ethereum!) });
      const signature = await walletClient.signMessage({ message: "Hello from AI-Enable!" });
      showToast("success", `Signed: ${signature.slice(0, 20)}...`);
    } catch (e) {
      showToast("error", e instanceof Error ? e.message : "Signing failed");
    }
  };

  useEffect(() => {
    if (!window.ethereum) return;
    const handleAccountsChanged = ([addr]: string[]) => {
      if (!addr) setWallet(null);
      else connect();
    };
    window.ethereum.on("accountsChanged", handleAccountsChanged);
    return () => { window.ethereum?.removeListener("accountsChanged", handleAccountsChanged); };
  }, [connect]);

  return (
    <div>
      {!wallet ? (
        <button onClick={connect} disabled={loading} className="btn btn-primary w-full">
          {loading ? (
            <svg className="animate-spin size-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
          ) : (
            <svg className="size-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
          )}
          {loading ? "Connecting..." : "Connect Wallet"}
        </button>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-mono text-base-content/70">{wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}</span>
            <button onClick={disconnect} className="btn btn-ghost btn-xs text-error">Disconnect</button>
          </div>

          <div className="flex justify-between items-center py-2 px-3 bg-base-200 rounded-box">
            <span className="text-sm text-base-content/60">Balance</span>
            <span className="text-sm font-semibold font-mono">{wallet.balance} ETH</span>
          </div>

          <div className="flex justify-between items-center py-2 px-3 bg-base-200 rounded-box">
            <span className="text-sm text-base-content/60">Network</span>
            <div className="flex gap-1">
              <button onClick={() => switchChain("eth")} className={`btn btn-xs ${chain === "eth" ? "btn-primary" : "btn-ghost"}`}>Ethereum</button>
              <button onClick={() => switchChain("abstract")} className={`btn btn-xs ${chain === "abstract" ? "btn-primary" : "btn-ghost"}`}>Abstract</button>
            </div>
          </div>

          <button onClick={signMessage} className="btn btn-outline btn-sm w-full">
            Sign Message (Demo)
          </button>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-max max-w-[94%] sm:max-w-lg z-[9999]">
          <div className={`${toast.type === "success" ? "bg-green-50 border-green-200 text-green-700" : "bg-red-50 border-red-200 text-red-700"} border text-sm rounded-lg px-4 py-3 shadow-lg`}>
            {toast.message}
          </div>
        </div>
      )}
    </div>
  );
}
