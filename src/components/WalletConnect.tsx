import { useState, useEffect, useRef } from "react";
import { createPublicClient, createWalletClient, custom, http, formatEther, parseEther } from "viem";
import { toAccount } from "viem/accounts";
import { abstractTestnet, abstract } from "viem/chains";
import { createAbstractClient, getSmartAccountAddressFromInitialSigner, deployAccount } from "@abstract-foundation/agw-client";
import type { Address } from "viem";

const TOKEN_ABI = [{"inputs":[{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"owner","type":"address"},{"indexed":true,"internalType":"address","name":"spender","type":"address"},{"indexed":false,"internalType":"uint256","name":"value","type":"uint256"}],"name":"Approval","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"from","type":"address"},{"indexed":true,"internalType":"address","name":"to","type":"address"},{"indexed":false,"internalType":"uint256","name":"value","type":"uint256"}],"name":"Transfer","type":"event"},{"inputs":[{"internalType":"address","name":"","type":"address"},{"internalType":"address","name":"","type":"address"}],"name":"allowance","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"spender","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"approve","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"balanceOf","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"decimals","outputs":[{"internalType":"uint8","name":"","type":"uint8"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"name","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"symbol","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"totalSupply","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"transfer","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"from","type":"address"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"transferFrom","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"}] as const;

const TOKEN_BYTECODE = "0x60806040526040518060400160405280600f81526020017f41492d456e61626c6520546f6b656e00000000000000000000000000000000008152506000908161004891906103bd565b506040518060400160405280600381526020017f41494500000000000000000000000000000000000000000000000000000000008152506001908161008c91906103bd565b5034801561009857600080fd5b506040516112db3803806112db8339810160408190526100b69190610514565b8060028190555080600360008473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168152602001908152602001600020819055508173ffffffffffffffffffffffffffffffffffffffff16600073ffffffffffffffffffffffffffffffffffffffff167fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef8360405161015b9190610561565b60405180910390a3505061057a565b600081519050919050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052604160045260246000fd5b7f4e487b7100000000000000000000000000000000000000000000000000000000600052602260045260246000fd5b600060028204905060018216806101ea57607f821691505b6020821081036101fd576101fc6101a6565b50919050565b60008190508160005260206000209050919050565b60006020601f8301049050919050565b600082821b905092915050565b60006008830261025f7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff82610224565b6102698683610224565b95508019841693508086168417925050509392505050565b6000819050919050565b6000819050919050565b60006102ad6102a86102a384610281565b61028a565b610281565b9050919050565b6000819050919050565b6102c683610293565b6102da6102d2826102b4565b848454610230565b825550505050565b6000600090505b828110156103225761031781600084810190506102e9565b600181019050610303565b505050565b601f82111561037557828111156103745761034181610203565b61034a83610215565b61035385610215565b602086101561036057600090505b80830161036f82840382610301565b505050505b5b505050565b600082821c905092915050565b60006103956000198460080261037a565b1980831691505092915050565b60006103ad8383610386565b9150826002028217905092915050565b6103c68261016f565b67ffffffffffffffff8111156103df576103de610179565b5b6103e982546101d3565b6103f4828285610327565b600060209050601f8311600181146104255760008415610415578287015190505b61041f85826103a2565b865550610484565b601f19841661043386610203565b60005b8281101561045a57848901518255600182019150602085019450602081019050610435565b868310156104775784890151610473601f891682610386565b8355505b6001600288020188555050505b505050505050565b600080fd5b600073ffffffffffffffffffffffffffffffffffffffff82169050919050565b60006104b982610490565b9050919050565b6104c9816104ae565b81146104d357600080fd5b50565b6000815190506104e5816104c0565b92915050565b6104f381610281565b81146104fd57600080fd5b50565b60008151905061050e816104ea565b92915050565b6000806040838503121561052b5761052a61048c565b5b6000610539858286016104d6565b925050602061054a85828601610500565b9150509250929050565b61055d81610281565b82525050565b60006020820190506105766000830184610554565b92915050565b610d54806105876000396000f3fe608060405234801561001057600080fd5b50600436106100915760003560e01c8063313ce56711610064578063313ce5671461013157806370a082311461014f57806395d89b411461017f578063a9059cbb1461019d578063dd62ed3e146101cd57610091565b806306fdde0314610095578063095ea7b3146100b357806318160ddd146100e357806323b872dd14610101575b600080fd5b61009d6101fd565b6040516100aa9190610927565b60405180910390f35b6100cd60048036038101906100c891906109d8565b610288565b6040516100da9190610a30565b60405180910390f35b6100eb610375565b6040516100f89190610a58565b60405180910390f35b61011b60048036038101906101169190610a71565b61037b565b6040516101289190610a30565b60405180910390f35b61013961065b565b6040516101469190610adc565b60405180910390f35b61016960048036038101906101649190610af5565b610660565b6040516101769190610a58565b60405180910390f35b610187610675565b6040516101949190610927565b60405180910390f35b6101b760048036038101906101b291906109d8565b610701565b6040516101c49190610a30565b60405180910390f35b6101e760048036038101906101e29190610b20565b610897565b6040516101f49190610a58565b60405180910390f35b6000805461020a90610b8b565b80601f016020809104026020016040519081016040528092919081815260200182805461023690610b8b565b80156102835780601f1061025857610100808354040283529160200191610283565b820191906000526020600020905b81548152906001019060200180831161026657829003601f168201915b505050505081565b600081600460003373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060008573ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168152602001908152602001600020819055508273ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff167f8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925846040516103639190610a58565b60405180910390a36001905092915050565b60025481565b600081600360008673ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020016000205410156103fc576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016103f390610c05565b60405180910390fd5b81600460008673ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060003373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020016000205410156104b7576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016104ae90610c6d565b60405180910390fd5b81600360008673ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060008282546105039190610cb8565b9250508190555081600360008573ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060008282546105599190610ceb565b9250508190555081600460008673ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060003373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060008282546105eb9190610cb8565b925050819055508273ffffffffffffffffffffffffffffffffffffffff168473ffffffffffffffffffffffffffffffffffffffff167fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef8460405161064f9190610a58565b60405180910390a3600190509392505050565b601281565b60036020528060005260406000206000915090505481565b6001805461068290610b8b565b80601f01602080910402602001604051908101604052809291908181526020018280546106ae90610b8b565b80156106fb5780601f106106d0576101008083540402835291602001916106fb565b820191906000526020600020905b8154815290600101906020018083116106de57829003601f168201915b505050505081565b600081600360003373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168152602001908152602001600020541015610782576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161077990610c05565b60405180910390fd5b81600360003373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060008282546107d19190610cb8565b9250508190555081600360008573ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060008282546108279190610ceb565b925050819055508273ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff167fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef8460405161088b9190610a58565b60405180910390a36001905092915050565b6004602052816000526040600020602052806000526040600020600091509150505481565b600081519050919050565b600082825260208201905092915050565b82818337600083830152505050565b6000601f19601f8301169050919050565b60006108f9826108b7565b61090381856108c1565b93506109138185602086016108d1565b61091c816108df565b840191505092915050565b6000602082019050818103600083015261094181846108ef565b905092915050565b600080fd5b600073ffffffffffffffffffffffffffffffffffffffff82169050919050565b60006109798261094e565b9050919050565b6109898161096e565b811461099457600080fd5b50565b6000813590506109a681610980565b92915050565b6000819050919050565b6109bf816109ac565b81146109ca57600080fd5b50565b6000813590506109dc816109b6565b92915050565b600080604083850312156109ef576109ee610949565b5b60006109fd85828601610997565b9250506020610a0e858286016109cd565b9150509250929050565b60008115159050919050565b610a2d81610a18565b82525050565b6000602082019050610a456000830184610a24565b92915050565b610a54816109ac565b82525050565b6000602082019050610a6d6000830184610a4b565b92915050565b600080600060608486031215610a8a57610a89610949565b5b6000610a9886828701610997565b9350506020610aa986828701610997565b9250506040610aba868287016109cd565b9150509250925092565b600060ff82169050919050565b610ada81610ac4565b82525050565b6000602082019050610af16000830184610ad1565b92915050565b600060208284031215610b0b57610b0a610949565b5b6000610b1984828501610997565b91505092915050565b60008060408385031215610b3757610b36610949565b5b6000610b4585828601610997565b9250506020610b5685828601610997565b9150509250929050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052602260045260246000fd5b60006002820490506001821680610ba357607f821691505b602082108103610bb657610bb5610b5e565b50919050565b7f696e73756666696369656e742062616c616e6365000000000000000000000000600082015250565b6000610bf36014836108c1565b9150610bfe82610bbc565b602082019050919050565b60006020820190508181036000830152610c1e81610be7565b9050919050565b7f696e73756666696369656e7420616c6c6f77616e636500000000000000000000600082015250565b6000610c5b6016836108c1565b9150610c6682610c25565b602082019050919050565b60006020820190508181036000830152610c8681610c4f565b9050919050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052601160045260246000fd5b6000610cc3826109ac565b9150610cce836109ac565b9250828203905081811115610ce657610ce5610c8d565b5b92915050565b6000610cf6826109ac565b9150610d01836109ac565b9250828201905080821115610d1957610d18610c8d565b5b9291505056fea2646970667358221220ba68ebcec4aed284c2acc682d0294029ec1b5a7c4224b933c00d8e3acb882d4664736f6c63430008230033";

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
      const abstractClient = await getAbstractClient();
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

  const deployToken = async () => {
    if (!wallet) return;
    setLoading(true);
    addTxLog({ action: "Token", hash: "", status: "pending", message: "Sign deployment in MetaMask..." });
    try {
      const abstractClient = await getAbstractClient();
      updateLastTxLog({ message: "Deploying AI-Enable Token contract..." });
      const hash = await abstractClient.deployContract({
        abi: TOKEN_ABI,
        bytecode: TOKEN_BYTECODE,
        args: [wallet.aaAddress, parseEther("1000")],
        chain: targetChain,
      });
      updateLastTxLog({ hash, status: "success", message: "Token deployed! 1,000 AIE minted to AA account" });
      await refreshBalances();
    } catch (e) {
      updateLastTxLog({ status: "failed", message: e instanceof Error ? e.message : "Token deployment failed" });
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

  const getAbstractClient = async () => {
    const txClient = createWalletClient({ chain: targetChain, transport: custom(window.ethereum!) });
    const signer = toAccount({
      address: wallet!.eoa,
      async signMessage({ message }) {
        return txClient.signMessage({ account: wallet!.eoa, message }) as Promise<`0x${string}`>;
      },
      async signTypedData(typedData) {
        const { domain, types, message, primaryType } = typedData as any;
        return txClient.signTypedData({ account: wallet!.eoa, domain, types, message, primaryType }) as Promise<`0x${string}`>;
      },
    });
    return createAbstractClient({
      signer,
      chain: targetChain,
      transport: custom(window.ethereum!),
    });
  };

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

          <div className="flex flex-wrap gap-2">
            {!wallet.isDeployed && (
              <button onClick={deploy} disabled={loading} className="btn btn-outline btn-sm flex-1">
                {loading ? "Deploying..." : "Deploy Account"}
              </button>
            )}
            <button onClick={sendDemoTx} disabled={loading || !wallet.isDeployed} className="btn btn-outline btn-sm flex-1">
              {loading ? "Sending..." : "Demo UserOp"}
            </button>
            <button onClick={deployToken} disabled={loading || !wallet.isDeployed} className="btn btn-outline btn-sm flex-1">
              {loading ? "Deploying..." : "Create Token"}
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
