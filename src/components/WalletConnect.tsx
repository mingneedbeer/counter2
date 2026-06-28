import { useState, useEffect, useRef } from "react";
import { createPublicClient, createWalletClient, custom, http, formatEther, parseEther } from "viem";
import { toAccount } from "viem/accounts";
import { abstractTestnet, abstract } from "viem/chains";
import { createAbstractClient, getSmartAccountAddressFromInitialSigner, deployAccount } from "@abstract-foundation/agw-client";
import type { Address } from "viem";

const checkIsDeployed = (publicClient: ReturnType<typeof createPublicClient>, address: Address) =>
  publicClient.getCode({ address }).then((code) => code !== "0x" && code !== undefined);

type WalletState = {
  eoa: `0x${string}`;
  aaAddress: `0x${string}`;
  eoaBalance: string;
  aaBalance: string;
  isDeployed: boolean;
  chainId: number;
};

type TxRecord = {
  action: string;
  hash: string;
  status: "pending" | "success" | "failed";
  message: string;
};

export default function WalletConnect() {
  const [wallet, setWallet] = useState<WalletState | null>(null);
  const [loading, setLoading] = useState(false);
  const [chain, setChain] = useState<"abstract_testnet" | "abstract">("abstract_testnet");
  const [txLog, setTxLog] = useState<TxRecord[]>([]);
  const [toast, setToast] = useState<{ type: string; message: string } | null>(null);
  const logEndRef = useRef<HTMLDivElement>(null);

  const targetChain = chain === "abstract" ? abstract : abstractTestnet;
  const explorerUrl = chain === "abstract"
    ? "https://explorer.abs.xyz/tx"
    : "https://explorer.testnet.abs.xyz/tx";

  const showToast = (type: string, message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const addTxLog = (entry: TxRecord) => {
    setTxLog(prev => [...prev, entry]);
  };

  const updateLastTxLog = (updates: Partial<TxRecord>) => {
    setTxLog(prev => {
      const copy = [...prev];
      if (copy.length > 0) Object.assign(copy[copy.length - 1], updates);
      return copy;
    });
  };

  const refreshBalances = async () => {
    if (!wallet) return;
    const publicClient = createPublicClient({ chain: targetChain, transport: http() });
    const [eoaBalance, aaBalance, isDeployed] = await Promise.all([
      publicClient.getBalance({ address: wallet.eoa }),
      publicClient.getBalance({ address: wallet.aaAddress }),
      checkIsDeployed(publicClient, wallet.aaAddress),
    ]);
    setWallet(prev => prev ? { ...prev, eoaBalance: formatEther(eoaBalance), aaBalance: formatEther(aaBalance), isDeployed } : prev);
  };

  // auto-refresh balances every 15s
  useEffect(() => {
    if (!wallet) return;
    const id = setInterval(refreshBalances, 15000);
    return () => clearInterval(id);
  }, [wallet?.eoa]);

  const getPublicClient = () =>
    createPublicClient({ chain: targetChain, transport: http() });

  const connect = async () => {
    if (!window.ethereum) {
      showToast("error", "No wallet found. Install MetaMask or Rabby.");
      return;
    }
    setLoading(true);
    try {
      const [eoa] = await window.ethereum.request({ method: "eth_requestAccounts" }) as [`0x${string}`];
      const targetChainId = chain === "abstract" ? "0xab5" : "0x2b74";
      try {
        await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: targetChainId }] });
      } catch {
        await window.ethereum.request({ method: "wallet_addEthereumChain", params: [{ chainId: targetChainId, chainName: targetChain.name, rpcUrls: targetChain.rpcUrls.default.http, nativeCurrency: targetChain.nativeCurrency }] });
      }

      const publicClient = getPublicClient();
      const aaAddress = await getSmartAccountAddressFromInitialSigner(eoa, publicClient);
      const [eoaBalance, aaBalance, isDeployed] = await Promise.all([
        publicClient.getBalance({ address: eoa }),
        publicClient.getBalance({ address: aaAddress }),
        checkIsDeployed(publicClient, aaAddress),
      ]);
      const chainId = await window.ethereum.request({ method: "eth_chainId" }) as string;
      setWallet({ eoa, aaAddress, eoaBalance: formatEther(eoaBalance), aaBalance: formatEther(aaBalance), isDeployed, chainId: parseInt(chainId) });
    } catch (e) {
      showToast("error", e instanceof Error ? e.message : "Connection failed");
    } finally {
      setLoading(false);
    }
  };

  const disconnect = () => {
    setWallet(null);
    setTxLog([]);
  };

  const switchChain = async (c: "abstract_testnet" | "abstract") => {
    setChain(c);
    setTxLog([]);
    if (!wallet) return;
    const target = c === "abstract" ? abstract : abstractTestnet;
    const targetChainId = c === "abstract" ? "0xab5" : "0x2b74";
    try {
      await window.ethereum!.request({ method: "wallet_switchEthereumChain", params: [{ chainId: targetChainId }] });
    } catch {
      await window.ethereum!.request({ method: "wallet_addEthereumChain", params: [{ chainId: targetChainId, chainName: target.name, rpcUrls: target.rpcUrls.default.http, nativeCurrency: target.nativeCurrency }] });
    }
    const publicClient = createPublicClient({ chain: target, transport: http() });
    const aaAddress = await getSmartAccountAddressFromInitialSigner(wallet.eoa, publicClient);
    const [eoaBalance, aaBalance, isDeployed] = await Promise.all([
      publicClient.getBalance({ address: wallet.eoa }),
      publicClient.getBalance({ address: aaAddress }),
      checkIsDeployed(publicClient, aaAddress),
    ]);
    setWallet({ ...wallet, aaAddress, eoaBalance: formatEther(eoaBalance), aaBalance: formatEther(aaBalance), isDeployed });
  };

  const deploy = async () => {
    if (!wallet) return;
    setLoading(true);
    addTxLog({ action: "Deploy", hash: "", status: "pending", message: "Sending deploy transaction..." });
    try {
      const publicClient = getPublicClient();
      const walletClient = createWalletClient({ account: wallet.eoa, chain: targetChain, transport: custom(window.ethereum!) });
      const result = await deployAccount({ walletClient, publicClient, initialSignerAddress: wallet.eoa });
      const hash = result.deploymentTransaction ?? "0x";
      updateLastTxLog({ hash, status: "success", message: "Account deployed" });
      setWallet(prev => prev ? { ...prev, isDeployed: true } : prev);
      await refreshBalances();
    } catch (e) {
      updateLastTxLog({ status: "failed", message: e instanceof Error ? e.message : "Deploy failed" });
    } finally {
      setLoading(false);
    }
  };

  const sendDemoTx = async () => {
    if (!wallet) return;
    setLoading(true);
    addTxLog({ action: "UserOp", hash: "", status: "pending", message: "Waiting for MetaMask confirmation..." });
    try {
      const txClient = createWalletClient({ chain: targetChain, transport: custom(window.ethereum!) });
      const signer = toAccount({
        address: wallet.eoa,
        async signMessage({ message }) {
          return txClient.signMessage({ account: wallet.eoa, message }) as Promise<`0x${string}`>;
        },
        async signTypedData(typedData) {
          const { domain, types, message, primaryType } = typedData as any;
          return txClient.signTypedData({ account: wallet.eoa, domain, types, message, primaryType }) as Promise<`0x${string}`>;
        },
      });
      const abstractClient = await createAbstractClient({
        signer,
        chain: targetChain,
        transport: custom(window.ethereum!),
      });
      updateLastTxLog({ message: "Submitting UserOp to Abstract bundler..." });
      const result = await abstractClient.sendCalls({
        calls: [{ to: wallet.eoa, value: parseEther("0.01"), data: "0x" }],
      });
      const hash = result.id;
      updateLastTxLog({ hash, status: "success", message: "UserOp submitted to bundler" });
      await refreshBalances();
      try {
        updateLastTxLog({ message: "UserOp submitted — waiting for confirmation..." });
        const publicClient = getPublicClient();
        await publicClient.waitForTransactionReceipt({ hash: hash as `0x${string}`, timeout: 30000 });
        updateLastTxLog({ message: "UserOp confirmed on-chain" });
        await refreshBalances();
      } catch {
        updateLastTxLog({ message: "UserOp submitted (confirmation timeout — check explorer)" });
      }
    } catch (e) {
      updateLastTxLog({ status: "failed", message: e instanceof Error ? e.message : "Transaction failed" });
    } finally {
      setLoading(false);
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
  }, []);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [txLog]);

  const noBalance = wallet && parseFloat(wallet.eoaBalance) === 0 && chain === "abstract_testnet";

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
          {noBalance && (
            <div className="alert alert-warning text-xs py-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="size-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
              <span>No ETH. Get free testnet ETH from <a href="https://faucet.triangleplatform.com/abstract/testnet" target="_blank" class="underline font-semibold">Triangle Faucet</a>, <a href="https://dashboard.alchemy.com/faucets" target="_blank" class="underline font-semibold">Alchemy</a>, or <a href="https://thirdweb.com/abstract-testnet" target="_blank" class="underline font-semibold">thirdweb</a>.</span>
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-base-content/50">EOA</span>
            <button onClick={disconnect} className="btn btn-ghost btn-xs text-error">Disconnect</button>
          </div>
          <div className="font-mono text-sm truncate">{wallet.eoa}</div>
          <div className="flex items-center gap-2 text-xs text-base-content/50">
            <span>Balance: <span className="font-mono font-semibold text-base-content">{wallet.eoaBalance} ETH</span></span>
            <button onClick={refreshBalances} className="btn btn-ghost btn-xs px-1" title="Refresh balances">
              <svg className="size-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            </button>
          </div>

          <div className="border-t pt-3 mt-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-primary font-semibold">Abstract Account (AA)</span>
              {!wallet.isDeployed && <span className="badge badge-outline badge-xs">counterfactual</span>}
              {wallet.isDeployed && <span className="badge badge-success badge-xs">deployed</span>}
            </div>
            <div className="font-mono text-sm truncate mt-1">{wallet.aaAddress}</div>
            <div className="flex items-center gap-2 text-xs text-base-content/50">
              <span>Balance: <span className="font-mono font-semibold text-base-content">{wallet.aaBalance} ETH</span></span>
            </div>
          </div>

          <div className="flex justify-between items-center py-2 px-3 bg-base-200 rounded-box">
            <span className="text-sm text-base-content/60">Network</span>
            <div className="flex gap-1">
              <button onClick={() => switchChain("abstract_testnet")} className={`btn btn-xs ${chain === "abstract_testnet" ? "btn-primary" : "btn-ghost"}`}>Testnet</button>
              <button onClick={() => switchChain("abstract")} className={`btn btn-xs ${chain === "abstract" ? "btn-primary" : "btn-ghost"}`}>Mainnet</button>
            </div>
          </div>

          <div className="flex gap-2">
            {!wallet.isDeployed && (
              <button onClick={deploy} disabled={loading} className="btn btn-outline btn-sm flex-1">
                {loading ? "Deploying..." : "Deploy Account"}
              </button>
            )}
            <button onClick={sendDemoTx} disabled={loading || !wallet.isDeployed} className="btn btn-outline btn-sm flex-1">
              {loading ? "Sending..." : "Demo UserOp"}
            </button>
          </div>

          {txLog.length > 0 && (
            <div className="border rounded-lg divide-y text-xs max-h-48 overflow-y-auto">
              {txLog.map((entry, i) => (
                <div key={i} className={`px-3 py-2 ${
                  entry.status === "success" ? "bg-green-50 text-green-700" :
                  entry.status === "failed" ? "bg-red-50 text-red-700" :
                  "bg-blue-50 text-blue-700"
                }`}>
                  <div className="flex items-center gap-1.5">
                    {entry.status === "pending" && (
                      <svg className="animate-spin size-3 shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                    )}
                    {entry.status === "success" && (
                      <svg className="size-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                    )}
                    {entry.status === "failed" && (
                      <svg className="size-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    )}
                    <span className="font-medium">{entry.action}:</span>
                    <span>{entry.message}</span>
                  </div>
                  {entry.hash && (
                    <a href={`${explorerUrl}/${entry.hash}`} target="_blank" rel="noopener noreferrer" className="font-mono underline block mt-0.5 ml-5">
                      {entry.hash.slice(0, 14)}...{entry.hash.slice(-8)}
                    </a>
                  )}
                </div>
              ))}
              <div ref={logEndRef} />
            </div>
          )}
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
