import { useState, useEffect, useRef } from "react";
import { createPublicClient, createWalletClient, custom, http, formatEther, parseEther, encodeFunctionData } from "viem";
import { toAccount } from "viem/accounts";
import { abstractTestnet, abstract } from "viem/chains";
import { encodeDeployData, sendEip712Transaction } from "viem/zksync";
import { createAbstractClient, getSmartAccountAddressFromInitialSigner, deployAccount } from "@abstract-foundation/agw-client";
import type { Address } from "viem";

const TOKEN_ABI = [{"inputs":[{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"owner","type":"address"},{"indexed":true,"internalType":"address","name":"spender","type":"address"},{"indexed":false,"internalType":"uint256","name":"value","type":"uint256"}],"name":"Approval","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"from","type":"address"},{"indexed":true,"internalType":"address","name":"to","type":"address"},{"indexed":false,"internalType":"uint256","name":"value","type":"uint256"}],"name":"Transfer","type":"event"},{"inputs":[{"internalType":"address","name":"","type":"address"},{"internalType":"address","name":"","type":"address"}],"name":"allowance","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"spender","type":"address"},{"internalType":"uint256","name":"value","type":"uint256"}],"name":"approve","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"balanceOf","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"decimals","outputs":[{"internalType":"uint8","name":"","type":"uint8"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"name","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"symbol","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"totalSupply","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"value","type":"uint256"}],"name":"transfer","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"from","type":"address"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"value","type":"uint256"}],"name":"transferFrom","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"}] as const;;

const TOKEN_BYTECODE_RAW = "0x00030000000000020000006003100270000000bc0330019700000001002001900000002f0000c13d0000008002000039000000400020043f000000040030008c000000520000413d000000000201043b000000e002200270000000c60020009c000000540000a13d000000c70020009c000001660000a13d000000c80020009c0000017a0000613d000000c90020009c000001b30000613d000000ca0020009c000000520000c13d0000000002000416000000000002004b000000520000c13d000000440030008c000000520000413d0000000402100370000000000202043b000000bf0020009c000000520000213d0000002401100370000000000101043b000000bf0010009c000000520000213d000000000020043f000300000001001d0000000401000039000000200010043f0000004002000039000000000100001902ed02ce0000040f0000000302000029000000000020043f000000200010043f00000000010000190000004002000039000001780000013d0000000002000416000000000002004b000000520000c13d0000001f02300039000000bd022001970000008002200039000000400020043f0000001f0430018f000000be053001980000008002500039000000400000613d0000008006000039000000000701034f000000007807043c0000000006860436000000000026004b0000003c0000c13d000000000004004b0000004d0000613d000000000151034f0000000304400210000000000502043300000000054501cf000000000545022f000000000101043b0000010004400089000000000141022f00000000014101cf000000000151019f0000000000120435000000400030008c000000520000413d000000800300043d000000bf0030009c0000009f0000a13d0000000001000019000002ef00010430000000cd0020009c0000011a0000213d000000d00020009c000001900000613d000000d10020009c000000520000c13d0000000002000416000000000002004b000000520000c13d000000440030008c000000520000413d0000000402100370000000000202043b000300000002001d000000bf0020009c000000520000213d0000002401100370000000000101043b000200000001001d0000000001000411000000000010043f0000000401000039000000200010043f0000000001000414000000bc0010009c000000bc01008041000000c001100210000000c3011001c7000080100200003902ed02e80000040f0000000100200190000000520000613d000000000101043b0000000302000029000000000020043f000000200010043f0000000001000414000000bc0010009c000000bc01008041000000c001100210000000c3011001c7000080100200003902ed02e80000040f0000000100200190000000520000613d000000000101043b0000000202000029000000000021041b000000400100043d0000000000210435000000bc0010009c000000bc0100804100000040011002100000000002000414000000bc0020009c000000bc02008041000000c002200210000000000112019f000000c0011001c70000800d020000390000000303000039000000db040000410000000005000411000000030600002902ed02e30000040f0000000100200190000000520000613d000000400100043d00000001020000390000000000210435000000bc0010009c000000bc010080410000004001100210000000dc011001c7000002ee0001042e000000000100041a000000010210019000000001041002700000007f0440618f0000001f0040008c00000000010000390000000101002039000000000021004b0000019e0000c13d000000a00100043d000300000001001d000000200040008c000000c40000413d000100000004001d000000000000043f0000000001000414000000bc0010009c000000bc01008041000000c001100210000000c0011001c70000801002000039000200000003001d02ed02e80000040f00000002030000290000000100200190000000520000613d000000000101043b00000001020000290000001f0220003900000005022002700000000002210019000000000021004b000000c40000813d000000000001041b0000000101100039000000000021004b000000c00000413d000000c101000041000000000010041b0000000104000039000000000104041a000000010010019000000001051002700000007f0550618f0000001f0050008c00000000020000390000000102002039000000000112013f00000001001001900000019e0000c13d0000001f0050008c000000ec0000a13d000100000005001d000000000040043f0000000001000414000000bc0010009c000000bc01008041000000c001100210000000c0011001c70000801002000039000200000003001d02ed02e80000040f00000002030000290000000100200190000000520000613d000000000101043b00000001020000290000001f0220003900000005022002700000000002210019000000000021004b0000000104000039000000ec0000813d000000000001041b0000000101100039000000000021004b000000e80000413d000000bf03300197000000c201000041000000000014041b00000002010000390000000302000029000000000021041b000200000003001d000000000030043f0000000301000039000000200010043f0000000001000414000000bc0010009c000000bc01008041000000c001100210000000c3011001c7000080100200003902ed02e80000040f0000000100200190000000520000613d000000000101043b0000000302000029000000000021041b000000400100043d0000000000210435000000bc0010009c000000bc0100804100000040011002100000000002000414000000bc0020009c000000bc02008041000000c002200210000000000112019f000000c0011001c70000800d020000390000000303000039000000c4040000410000000005000019000000020600002902ed02e30000040f0000000100200190000000520000613d000000200100003900000100001004430000012000000443000000c501000041000002ee0001042e000000ce0020009c000001a40000613d000000cf0020009c000000520000c13d0000000002000416000000000002004b000000520000c13d000000640030008c000000520000413d0000000402100370000000000302043b000000bf0030009c000000520000213d0000002402100370000000000202043b000200000002001d000000bf0020009c000000520000213d0000004401100370000000000101043b000100000001001d000000000030043f0000000301000039000000200010043f0000000001000414000000bc0010009c000000bc01008041000000c001100210000000c3011001c70000801002000039000300000003001d02ed02e80000040f00000003030000290000000100200190000000520000613d000000000101043b000000000101041a000000010010006c000001d10000413d000000000030043f0000000402000039000000200020043f0000000001000414000000bc0010009c000000bc01008041000000c001100210000000c3011001c7000080100200003902ed02e80000040f0000000100200190000000520000613d000000000101043b0000000002000411000000000020043f000000200010043f0000000001000414000000bc0010009c000000bc01008041000000c001100210000000c3011001c7000080100200003902ed02e80000040f00000003030000290000000100200190000000520000613d000000000101043b000000000101041a000000010010006c0000025f0000813d000000400100043d0000004402100039000000d703000041000000000032043500000024021000390000001603000039000001d70000013d000000cb0020009c000001ac0000613d000000cc0020009c000000520000c13d0000000002000416000000000002004b000000520000c13d000000240030008c000000520000413d0000000401100370000000000101043b000000bf0010009c000000520000213d000000000010043f0000000301000039000000200010043f0000004002000039000000000100001902ed02ce0000040f000001a80000013d0000000001000416000000000001004b000000520000c13d0000000103000039000000000203041a000000010520019000000001012002700000007f0410018f00000000010460190000001f0010008c00000000060000390000000106002039000000000626013f00000001006001900000019e0000c13d000000800010043f000000000005004b000001eb0000c13d000000de01200197000000a00010043f000000000004004b000001e80000013d0000000001000416000000000001004b000000520000c13d000000000200041a000000010420019000000001012002700000007f0310018f00000000010360190000001f0010008c00000000050000390000000105002039000000000525013f0000000100500190000001e20000613d000000d501000041000000000010043f0000002201000039000000040010043f000000d601000041000002ef000104300000000001000416000000000001004b000000520000c13d0000000201000039000000000101041a000000800010043f000000d201000041000002ee0001042e0000000001000416000000000001004b000000520000c13d0000001201000039000000800010043f000000d201000041000002ee0001042e0000000002000416000000000002004b000000520000c13d000000440030008c000000520000413d0000000402100370000000000202043b000300000002001d000000bf0020009c000000520000213d0000002401100370000000000101043b000200000001001d0000000001000411000000000010043f0000000301000039000000200010043f0000000001000414000000bc0010009c000000bc01008041000000c001100210000000c3011001c7000080100200003902ed02e80000040f0000000100200190000000520000613d000000000101043b000000000101041a000000020010006c000001fe0000813d000000400100043d0000004402100039000000da030000410000000000320435000000240210003900000014030000390000000000320435000000d8020000410000000000210435000000040210003900000020030000390000000000320435000000bc0010009c000000bc010080410000004001100210000000d9011001c7000002ef00010430000000800010043f000000000004004b000001f90000c13d000000de01200197000000a00010043f000000000003004b000000c001000039000000a001006039000002200000013d000000000030043f000000020020008c000001fc0000413d000000d30200004100000000040000190000000003040019000000000402041a000000a005300039000000000045043500000001022000390000002004300039000000000014004b000001f00000413d0000021f0000013d000000000000043f000000020020008c000002150000813d000000a001000039000002200000013d0000000001000411000000000010043f0000000301000039000000200010043f0000000001000414000000bc0010009c000000bc01008041000000c001100210000000c3011001c7000080100200003902ed02e80000040f0000000100200190000000520000613d000000000101043b000000000201041a000000020220006c0000023b0000813d000000d501000041000000000010043f0000001101000039000000040010043f000000d601000041000002ef00010430000000dd0200004100000000040000190000000003040019000000000402041a000000a005300039000000000045043500000001022000390000002004300039000000000014004b000002170000413d000000c001300039000000610110008a000000df0010009c000002350000213d000000e0011001970000008001100039000000d40010009c000002350000213d000000400010043f0000008002000039000300000001001d02ed02b90000040f00000003020000290000000001210049000000bc0010009c000000bc010080410000006001100210000000bc0020009c000000bc020080410000004002200210000000000121019f000002ee0001042e000000d501000041000000000010043f0000004101000039000000040010043f000000d601000041000002ef00010430000000000021041b0000000301000029000000000010043f0000000301000039000000200010043f0000000001000414000000bc0010009c000000bc01008041000000c001100210000000c3011001c7000080100200003902ed02e80000040f0000000100200190000000520000613d000000000101043b000000000201041a0000000203000029000000000032001a0000020f0000413d0000000002320019000000000021041b000000400100043d0000000000310435000000bc0010009c000000bc0100804100000040011002100000000002000414000000bc0020009c000000bc02008041000000c002200210000000000112019f000000c0011001c70000800d020000390000000303000039000000c404000041000000920000013d000000000030043f0000000301000039000000200010043f0000000001000414000000bc0010009c000000bc01008041000000c001100210000000c3011001c7000080100200003902ed02e80000040f00000001002001900000000103000029000000520000613d000000000101043b000000000201041a000000000232004b0000020f0000413d000000000021041b0000000201000029000000000010043f0000000301000039000000200010043f0000000001000414000000bc0010009c000000bc01008041000000c001100210000000c3011001c7000080100200003902ed02e80000040f00000001002001900000000103000029000000520000613d000000000101043b000000000201041a000000000032001a0000020f0000413d0000000102200029000000000021041b0000000301000029000000000010043f0000000401000039000000200010043f0000000001000414000000bc0010009c000000bc01008041000000c001100210000000c3011001c7000080100200003902ed02e80000040f0000000100200190000000520000613d000000000101043b0000000002000411000000000020043f000000200010043f0000000001000414000000bc0010009c000000bc01008041000000c001100210000000c3011001c7000080100200003902ed02e80000040f0000000100200190000000520000613d000000000101043b000000000201041a000000010220006c0000020f0000413d000000000021041b000000400100043d00000001020000290000000000210435000000bc0010009c000000bc0100804100000040011002100000000002000414000000bc0020009c000000bc02008041000000c002200210000000000112019f000000c0011001c70000800d020000390000000303000039000000c4040000410000000305000029000000020600002902ed02e30000040f0000000100200190000000520000613d000000970000013d00000020030000390000000004310436000000003202043400000000002404350000004001100039000000000002004b000002c80000613d000000000400001900000000054100190000000006430019000000000606043300000000006504350000002004400039000000000024004b000002c10000413d000000000321001900000000000304350000001f02200039000000e0022001970000000001210019000000000001042d000000bc0010009c000000bc010080410000004001100210000000bc0020009c000000bc020080410000006002200210000000000112019f0000000002000414000000bc0020009c000000bc02008041000000c002200210000000000112019f000000e1011001c7000080100200003902ed02e80000040f0000000100200190000002e10000613d000000000101043b000000000001042d0000000001000019000002ef00010430000002e6002104210000000102000039000000000001042d0000000002000019000000000001042d000002eb002104230000000102000039000000000001042d0000000002000019000000000001042d000002ed00000432000002ee0001042e000002ef0001043000000000000000000000000000000000000000000000000000000000ffffffff00000000000000000000000000000000000000000000000000000001ffffffe000000000000000000000000000000000000000000000000000000000ffffffe0000000000000000000000000ffffffffffffffffffffffffffffffffffffffff020000000000000000000000000000000000002000000000000000000000000041492d456e61626c6520546f6b656e000000000000000000000000000000001e41494500000000000000000000000000000000000000000000000000000000060200000000000000000000000000000000000040000000000000000000000000ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef000000020000000000000000000000000000004000000100000000000000000000000000000000000000000000000000000000000000000000000000313ce5660000000000000000000000000000000000000000000000000000000095d89b400000000000000000000000000000000000000000000000000000000095d89b4100000000000000000000000000000000000000000000000000000000a9059cbb00000000000000000000000000000000000000000000000000000000dd62ed3e00000000000000000000000000000000000000000000000000000000313ce5670000000000000000000000000000000000000000000000000000000070a082310000000000000000000000000000000000000000000000000000000018160ddc0000000000000000000000000000000000000000000000000000000018160ddd0000000000000000000000000000000000000000000000000000000023b872dd0000000000000000000000000000000000000000000000000000000006fdde0300000000000000000000000000000000000000000000000000000000095ea7b30000000000000000000000000000000000000020000000800000000000000000b10e2d527612073b26eecdfd717e6a320cf44b4afac2b0732d9fcbe2b7fa0cf6000000000000000000000000000000000000000000000000ffffffffffffffff4e487b71000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000024000000000000000000000000696e73756666696369656e7420616c6c6f77616e63650000000000000000000008c379a0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000064000000000000000000000000696e73756666696369656e742062616c616e63650000000000000000000000008c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b9250000000000000000000000000000000000000020000000000000000000000000290decd9548b62a8d60345a988386fc84ba6bc95484008f6362f93160ef3e563ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe00200000000000000000000000000000000000000000000000000000000000000000000000000000000a2646970667358221220cb8c4d87a95f7b7420f29eeea5c16263efb4cfde4d7b93c87af988ddad99910564736f6c6378247a6b736f6c633a312e352e31353b736f6c633a302e382e32343b6c6c766d3a312e302e320055";

const checkIsDeployed = (publicClient: ReturnType<typeof createPublicClient>, address: Address) =>
  publicClient.getCode({ address }).then((code) => code !== "0x" && code !== undefined);

type TxRecord = {
  action: string;
  hash: string;
  status: "pending" | "success" | "failed";
  message: string;
};

export default function WalletConnect({ userEmail }: { userEmail?: string }) {
  const [wallet, setWallet] = useState<WalletState | null>(null);
  const [loading, setLoading] = useState(false);
  const [chain, setChain] = useState<"abstract_testnet" | "abstract">("abstract_testnet");
  const [txLog, setTxLog] = useState<TxRecord[]>([]);
  const [toast, setToast] = useState<{ type: string; message: string } | null>(null);
  const [tokenAddress, setTokenAddress] = useState<Address | null>(null);
  const [tokenBalance, setTokenBalance] = useState("0");
  const [transferTo, setTransferTo] = useState("");
  const [transferAmount, setTransferAmount] = useState("");
  const logEndRef = useRef<HTMLDivElement>(null);

  const targetChain = chain === "abstract" ? abstract : abstractTestnet;
  const explorerUrl = chain === "abstract"
    ? "https://explorer.abs.xyz"
    : "https://explorer.testnet.abs.xyz";

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

  useEffect(() => {
    if (!wallet) return;
    const id = setInterval(refreshBalances, 15000);
    return () => clearInterval(id);
  }, [wallet?.eoa]);

  const loadTokenBalance = async () => {
    if (!wallet || !tokenAddress) return;
    try {
      const publicClient = getPublicClient();
      const balance = await publicClient.readContract({
        address: tokenAddress,
        abi: TOKEN_ABI,
        functionName: "balanceOf",
        args: [wallet.aaAddress],
      });
      setTokenBalance(formatEther(balance as bigint));
    } catch {
      setTokenBalance("0");
    }
  };

  useEffect(() => {
    if (!wallet || !tokenAddress) return;
    loadTokenBalance();
    const id = setInterval(loadTokenBalance, 15000);
    return () => clearInterval(id);
  }, [wallet?.aaAddress, tokenAddress]);

  useEffect(() => {
    const aa = wallet?.aaAddress;
    const key = aa ? `tokenAddress_${chain}_${aa}` : null;
    try { setTokenAddress(key ? localStorage.getItem(key) as Address | null : null); }
    catch { setTokenAddress(null); }
    setTransferTo("");
    setTransferAmount("");
  }, [chain, wallet?.aaAddress]);

  const getPublicClient = () =>
    createPublicClient({ chain: targetChain, transport: http() });

  const intentionallyDisconnected = useRef(false);

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
      intentionallyDisconnected.current = false;
    } catch (e) {
      showToast("error", e instanceof Error ? e.message : "Connection failed");
    } finally {
      setLoading(false);
    }
  };

  const disconnect = () => {
    intentionallyDisconnected.current = true;
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

  const CONTRACT_DEPLOYER_ADDRESS = "0x0000000000000000000000000000000000008006";

  const deployToken = async () => {
    if (!wallet) return;
    setLoading(true);
    addTxLog({ action: "Token", hash: "", status: "pending", message: "Sign deployment in MetaMask..." });
      try {
      const data = encodeDeployData({
        abi: TOKEN_ABI,
        bytecode: TOKEN_BYTECODE_RAW,
        args: [wallet.aaAddress, parseEther("1000")],
      });
      const deployerWallet = createWalletClient({
        account: wallet.eoa,
        chain: targetChain,
        transport: custom(window.ethereum!),
      });
      updateLastTxLog({ message: "Deploying AI-Enable Token contract from EOA..." });
      const hash = await sendEip712Transaction(deployerWallet, {
        account: wallet.eoa,
        to: CONTRACT_DEPLOYER_ADDRESS,
        data,
        factoryDeps: [TOKEN_BYTECODE_RAW],
        gas: 10_000_000n,
      });
      updateLastTxLog({ hash, status: "success", message: "Token deployment submitted!" });
      await refreshBalances();
      try {
        updateLastTxLog({ message: "Token deployment submitted — waiting for confirmation..." });
        const publicClient = getPublicClient();
        const receipt = await publicClient.waitForTransactionReceipt({ hash: hash as `0x${string}`, timeout: 60000 });
        if (receipt.contractAddress) {
          const key = `tokenAddress_${chain}_${wallet.aaAddress}`;
          setTokenAddress(receipt.contractAddress);
          try { localStorage.setItem(key, receipt.contractAddress); } catch {}
          updateLastTxLog({ message: `Token deployed at ${receipt.contractAddress}` });
          await loadTokenBalance();
        } else {
          updateLastTxLog({ message: "Token deployed! 1,000 AIE minted to AA account" });
        }
        await refreshBalances();
      } catch {
        updateLastTxLog({ message: "Token deployment submitted (confirmation timeout — check explorer)" });
      }
    } catch (e) {
      updateLastTxLog({ status: "failed", message: e instanceof Error ? e.message : "Token deployment failed" });
    } finally {
      setLoading(false);
    }
  };

  const transferToken = async () => {
    if (!wallet || !tokenAddress || !transferTo || !transferAmount) return;
    setLoading(true);
    addTxLog({ action: "Transfer", hash: "", status: "pending", message: "Signing token transfer in MetaMask..." });
    try {
      const abstractClient = await getAbstractClient();
      const data = encodeFunctionData({
        abi: TOKEN_ABI,
        functionName: "transfer",
        args: [transferTo as Address, parseEther(transferAmount)],
      });
      updateLastTxLog({ message: "Submitting transfer UserOp to Abstract bundler..." });
      const result = await abstractClient.sendCalls({
        calls: [{ to: tokenAddress, data, value: 0n }],
      });
      const hash = result.id;
      updateLastTxLog({ hash, status: "success", message: "Transfer UserOp submitted to bundler" });
      try {
        updateLastTxLog({ message: "Waiting for transfer confirmation..." });
        const publicClient = getPublicClient();
        await publicClient.waitForTransactionReceipt({ hash: hash as `0x${string}`, timeout: 30000 });
        updateLastTxLog({ message: "Token transfer confirmed!" });
        await loadTokenBalance();
        await refreshBalances();
      } catch {
        updateLastTxLog({ message: "Transfer submitted (confirmation timeout — check explorer)" });
      }
    } catch (e) {
      updateLastTxLog({ status: "failed", message: e instanceof Error ? e.message : "Transfer failed" });
    } finally {
      setLoading(false);
    }
  };

  const connectRef = useRef(connect);
  connectRef.current = connect;

  useEffect(() => {
    if (!window.ethereum) return;
    const handleAccountsChanged = ([addr]: string[]) => {
      if (!addr) {
        setWallet(null);
      } else if (!intentionallyDisconnected.current) {
        connectRef.current();
      }
    };
    window.ethereum.on("accountsChanged", handleAccountsChanged);
    window.ethereum.request({ method: "eth_accounts" }).then((accounts: any) => {
      if (accounts?.length > 0 && !intentionallyDisconnected.current) {
        connectRef.current();
      }
    });
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
          </div>

          {tokenAddress ? (
            <div className="border rounded-box p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-secondary font-semibold">AI-Enable Token {userEmail ? `(${userEmail})` : "(AIE)"}</span>
              </div>
              <div className="font-mono text-xs truncate">
                Contract:{" "}
                <a href={`${explorerUrl}/address/${tokenAddress}`} target="_blank" rel="noopener noreferrer" className="underline">
                  {tokenAddress.slice(0, 14)}...{tokenAddress.slice(-8)}
                </a>
              </div>
              <div className="text-xs text-base-content/50">
                Balance: <span className="font-mono font-semibold text-base-content">{tokenBalance} AIE</span>
              </div>
              <div className="border-t pt-2 space-y-2">
                <span className="text-xs font-semibold">Transfer AIE</span>
                <input
                  type="text"
                  placeholder="Recipient address"
                  value={transferTo}
                  onChange={(e) => setTransferTo(e.target.value)}
                  className="input input-bordered input-xs w-full font-mono"
                />
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Amount"
                    value={transferAmount}
                    onChange={(e) => setTransferAmount(e.target.value)}
                    className="input input-bordered input-xs flex-1 font-mono"
                  />
                  <button onClick={transferToken} disabled={loading || !wallet.isDeployed} className="btn btn-primary btn-sm">
                    {loading ? "Sending..." : "Transfer"}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <button onClick={deployToken} disabled={loading || !wallet.isDeployed} className="btn btn-outline btn-sm w-full">
              {loading ? "Deploying..." : "Create Token"}
            </button>
          )}

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
                    <a href={`${explorerUrl}/tx/${entry.hash}`} target="_blank" rel="noopener noreferrer" className="font-mono underline block mt-0.5 ml-5">
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
