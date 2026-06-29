import { useState, useEffect, useRef } from "react";
import { createPublicClient, createWalletClient, custom, http, formatEther, parseEther } from "viem";
import { toAccount } from "viem/accounts";
import { abstractTestnet, abstract } from "viem/chains";
import { encodeDeployData, sendEip712Transaction } from "viem/zksync";
import { createAbstractClient, getSmartAccountAddressFromInitialSigner, deployAccount } from "@abstract-foundation/agw-client";
import type { Address } from "viem";

const TOKEN_ABI = [{"inputs":[{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"owner","type":"address"},{"indexed":true,"internalType":"address","name":"spender","type":"address"},{"indexed":false,"internalType":"uint256","name":"value","type":"uint256"}],"name":"Approval","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"from","type":"address"},{"indexed":true,"internalType":"address","name":"to","type":"address"},{"indexed":false,"internalType":"uint256","name":"value","type":"uint256"}],"name":"Transfer","type":"event"},{"inputs":[{"internalType":"address","name":"","type":"address"},{"internalType":"address","name":"","type":"address"}],"name":"allowance","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"spender","type":"address"},{"internalType":"uint256","name":"value","type":"uint256"}],"name":"approve","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"balanceOf","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"decimals","outputs":[{"internalType":"uint8","name":"","type":"uint8"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"name","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"symbol","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"totalSupply","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"value","type":"uint256"}],"name":"transfer","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"from","type":"address"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"value","type":"uint256"}],"name":"transferFrom","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"}] as const;;

const TOKEN_BYTECODE_RAW = "0x00040000000000020000008004000039000000400040043f0000006003100270000000ca033001970000000100200190000000270000c13d000000040030008c0000026e0000413d000000000201043b000000e002200270000000d60020009c000000800000a13d000000d70020009c0000011b0000a13d000000d80020009c000001320000613d000000d90020009c0000015b0000613d000000da0020009c0000026e0000c13d0000000002000416000000000002004b0000026e0000c13d000000440030008c0000026e0000413d0000000402100370000000000202043b000000cd0020009c0000026e0000213d0000002401100370000000000101043b000000cd0010009c0000026e0000213d000400000001001d0000000001020019032303080000040f0000000402000029000001290000013d0000000002000416000000000002004b0000026e0000c13d0000001f02300039000000cb022001970000008002200039000000400020043f0000001f0530018f000000cc063001980000008002600039000000370000613d000000000701034f000000007807043c0000000004840436000000000024004b000000330000c13d000000000005004b000000440000613d000000000161034f0000000304500210000000000502043300000000054501cf000000000545022f000000000101043b0000010004400089000000000141022f00000000014101cf000000000151019f0000000000120435000000400030008c0000026e0000413d000000800500043d000000cd0050009c0000026e0000213d000000000100041a000000010210019000000001031002700000007f0330618f0000001f0030008c00000000010000390000000101002039000000000021004b0000007a0000c13d000000a00100043d000400000001001d000000200030008c0000006d0000413d000200000003001d000000000000043f0000000001000414000000ca0010009c000000ca01008041000000c001100210000000ce011001c70000801002000039000300000005001d0323031e0000040f000000030500002900000001002001900000026e0000613d000000000101043b00000002020000290000001f02200039000000050220027000000000030000190000000004130019000000000004041b0000000103300039000000000023004b000000680000413d000000cf01000041000000000010041b0000000106000039000000000106041a000000010010019000000001031002700000007f0330618f0000001f0030008c00000000020000390000000102002039000000000112013f00000001001001900000018c0000613d000000d401000041000000000010043f0000002201000039000000040010043f000000d5010000410000032500010430000000dd0020009c000000cd0000213d000000e00020009c000001370000613d000000e10020009c0000026e0000c13d0000000002000416000000000002004b0000026e0000c13d000000440030008c0000026e0000413d0000000402100370000000000202043b000400000002001d000000cd0020009c0000026e0000213d0000002401100370000000000101043b000200000001001d0000000001000411000000cd01100197000300000001001d000000000010043f0000000501000039000000200010043f0000000001000414000000ca0010009c000000ca01008041000000c001100210000000d1011001c700008010020000390323031e0000040f00000001002001900000026e0000613d000000000101043b0000000402000029000000000020043f000000200010043f0000000001000414000000ca0010009c000000ca01008041000000c001100210000000d1011001c700008010020000390323031e0000040f00000001002001900000026e0000613d000000000101043b0000000202000029000000000021041b000000400100043d0000000000210435000000ca0010009c000000ca0100804100000040011002100000000002000414000000ca0020009c000000ca02008041000000c002200210000000000112019f000000ce011001c70000800d020000390000000303000039000000e80400004100000003050000290000000406000029032303190000040f00000001002001900000026e0000613d000000400100043d00000001020000390000000000210435000000ca0010009c000000ca010080410000004001100210000000e2011001c7000003240001042e000000de0020009c0000014a0000613d000000df0020009c0000026e0000c13d0000000002000416000000000002004b0000026e0000c13d000000640030008c0000026e0000413d0000000402100370000000000302043b000000cd0030009c0000026e0000213d0000002402100370000000000202043b000300000002001d000000cd0020009c0000026e0000213d0000004401100370000000000101043b000200000001001d000000000030043f0000000401000039000000200010043f0000000001000414000000ca0010009c000000ca01008041000000c001100210000000d1011001c70000801002000039000400000003001d0323031e0000040f000000040300002900000001002001900000026e0000613d000000000101043b000000000101041a000000020010006c0000017b0000413d000000000030043f0000000502000039000000200020043f0000000001000414000000ca0010009c000000ca01008041000000c001100210000000d1011001c700008010020000390323031e0000040f00000001002001900000026e0000613d000000000101043b0000000002000411000000cd02200197000100000002001d000000000020043f000000200010043f0000000001000414000000ca0010009c000000ca01008041000000c001100210000000d1011001c700008010020000390323031e0000040f000000040300002900000001002001900000026e0000613d000000000101043b000000000101041a000000020010006c000002150000813d000000400100043d0000004402100039000000e403000041000000000032043500000024021000390000001603000039000001810000013d000000db0020009c000001520000613d000000dc0020009c0000026e0000c13d0000000002000416000000000002004b0000026e0000c13d000000240030008c0000026e0000413d0000000401100370000000000201043b000000cd0020009c0000026e0000213d0000000401000039032302f80000040f000000000101041a000000400200043d0000000000120435000000ca0020009c000000ca020080410000004001200210000000e2011001c7000003240001042e0000000001000416000000000001004b0000026e0000c13d00000001010000390000013b0000013d0000000001000416000000000001004b0000026e0000c13d0000000001000019032302700000040f0000000002010019000000400100043d000400000001001d032302c30000040f00000004020000290000000001210049000000ca0010009c000000ca010080410000006001100210000000ca0020009c000000ca020080410000004002200210000000000121019f000003240001042e0000000001000416000000000001004b0000026e0000c13d0000000301000039000000000101041a000000800010043f000000e301000041000003240001042e0000000001000416000000000001004b0000026e0000c13d0000000201000039000000000101041a000000ff0110018f000000800010043f000000e301000041000003240001042e0000000002000416000000000002004b0000026e0000c13d000000440030008c0000026e0000413d0000000402100370000000000202043b000400000002001d000000cd0020009c0000026e0000213d0000002401100370000000000101043b000300000001001d0000000001000411000000cd01100197000200000001001d000000000010043f0000000401000039000000200010043f0000000001000414000000ca0010009c000000ca01008041000000c001100210000000d1011001c700008010020000390323031e0000040f00000001002001900000026e0000613d000000000101043b000000000101041a000000030010006c000001d90000813d000000400100043d0000004402100039000000e7030000410000000000320435000000240210003900000014030000390000000000320435000000e5020000410000000000210435000000040210003900000020030000390000000000320435000000ca0010009c000000ca010080410000004001100210000000e6011001c70000032500010430000000200030008c000001a60000413d000200000003001d000000000060043f0000000001000414000000ca0010009c000000ca01008041000000c001100210000000ce011001c70000801002000039000300000005001d0323031e0000040f000000030500002900000001002001900000026e0000613d000000000101043b00000002020000290000001f022000390000000502200270000000000300001900000001060000390000000004130019000000000004041b0000000103300039000000000023004b000001a10000413d000000cd04500197000000d001000041000000000016041b0000000201000039000000000201041a000000e90220019700000012022001bf000000000021041b00000003010000390000000402000029000000000021041b000300000004001d000000000040043f0000000401000039000000200010043f0000000001000414000000ca0010009c000000ca01008041000000c001100210000000d1011001c700008010020000390323031e0000040f00000001002001900000026e0000613d000000000101043b0000000402000029000000000021041b000000400100043d0000000000210435000000ca0010009c000000ca0100804100000040011002100000000002000414000000ca0020009c000000ca02008041000000c002200210000000000112019f000000ce011001c70000800d020000390000000303000039000000d20400004100000000050000190000000306000029032303190000040f00000001002001900000026e0000613d000000200100003900000100001004430000012000000443000000d301000041000003240001042e0000000201000029000000000010043f0000000401000039000000200010043f0000000001000414000000ca0010009c000000ca01008041000000c001100210000000d1011001c700008010020000390323031e0000040f00000001002001900000026e0000613d000000000101043b000000000201041a000000030220006c000001f00000813d000000d401000041000000000010043f0000001101000039000000040010043f000000d5010000410000032500010430000000000021041b0000000401000029000000000010043f0000000401000039000000200010043f0000000001000414000000ca0010009c000000ca01008041000000c001100210000000d1011001c700008010020000390323031e0000040f00000001002001900000026e0000613d000000000101043b000000000201041a0000000303000029000000000032001a000001ea0000413d0000000002320019000000000021041b000000400100043d0000000000310435000000ca0010009c000000ca0100804100000040011002100000000002000414000000ca0020009c000000ca02008041000000c002200210000000000112019f000000ce011001c70000800d020000390000000303000039000000d2040000410000000205000029000000c10000013d000000000030043f0000000401000039000000200010043f0000000001000414000000ca0010009c000000ca01008041000000c001100210000000d1011001c700008010020000390323031e0000040f000000010020019000000002030000290000026e0000613d000000000101043b000000000201041a000000000232004b000001ea0000413d000000000021041b0000000301000029000000000010043f0000000401000039000000200010043f0000000001000414000000ca0010009c000000ca01008041000000c001100210000000d1011001c700008010020000390323031e0000040f000000010020019000000002030000290000026e0000613d000000000101043b000000000201041a000000000032001a000001ea0000413d0000000202200029000000000021041b0000000401000029000000000010043f0000000501000039000000200010043f0000000001000414000000ca0010009c000000ca01008041000000c001100210000000d1011001c700008010020000390323031e0000040f00000001002001900000026e0000613d000000000101043b0000000102000029000000000020043f000000200010043f0000000001000414000000ca0010009c000000ca01008041000000c001100210000000d1011001c700008010020000390323031e0000040f00000001002001900000026e0000613d000000000101043b000000000201041a000000020220006c000001ea0000413d000000000021041b000000400100043d00000002020000290000000000210435000000ca0010009c000000ca0100804100000040011002100000000002000414000000ca0020009c000000ca02008041000000c002200210000000000112019f000000ce011001c70000800d020000390000000303000039000000d20400004100000004050000290000000306000029032303190000040f0000000100200190000000c50000c13d0000000001000019000003250001043000040000000000020000000006000415000000000201041a000000010320019000000001072002700000007f0770618f0000001f0070008c00000000040000390000000104002039000000000034004b000002b50000c13d000000400500043d0000000004750436000000000003004b0000029d0000613d000100000004001d000200000007001d000300000006001d000400000005001d000000000010043f0000000001000414000000ca0010009c000000ca01008041000000c001100210000000ce011001c700008010020000390323031e0000040f0000000100200190000002c10000613d0000000207000029000000000007004b0000000306000029000002a30000613d000000000201043b0000000001000019000000040500002900000001080000290000000003810019000000000402041a000000000043043500000001022000390000002001100039000000000071004b000002950000413d000002a50000013d000000e9012001970000000000140435000000000007004b00000020010000390000000001006039000002a50000013d000000000100001900000004050000290000000002000415000000000226004900000000020000020000003f01100039000000eb021001970000000001520019000000000021004b00000000020000390000000102004039000000ea0010009c000002bb0000213d0000000100200190000002bb0000c13d000000400010043f0000000001050019000000000001042d000000d401000041000000000010043f0000002201000039000000040010043f000000d5010000410000032500010430000000d401000041000000000010043f0000004101000039000000040010043f000000d5010000410000032500010430000000000100001900000325000104300000002003000039000000000331043600000000420204340000000000230435000000eb062001970000001f0520018f0000004001100039000000000014004b000002dc0000813d000000000006004b000002d80000613d00000000085400190000000007510019000000200770008a000000200880008a0000000009670019000000000a680019000000000a0a04330000000000a90435000000200660008c000002d20000c13d000000000005004b000002f20000613d0000000007010019000002e80000013d0000000007610019000000000006004b000002e50000613d00000000080400190000000009010019000000008a0804340000000009a90436000000000079004b000002e10000c13d000000000005004b000002f20000613d00000000046400190000000305500210000000000607043300000000065601cf000000000656022f00000000040404330000010005500089000000000454022f00000000045401cf000000000464019f0000000000470435000000000412001900000000000404350000001f02200039000000eb022001970000000001120019000000000001042d000000cd02200197000000000020043f000000200010043f0000000001000414000000ca0010009c000000ca01008041000000c001100210000000d1011001c700008010020000390323031e0000040f0000000100200190000003060000613d000000000101043b000000000001042d00000000010000190000032500010430000000cd01100197000000000010043f0000000501000039000000200010043f0000000001000414000000ca0010009c000000ca01008041000000c001100210000000d1011001c700008010020000390323031e0000040f0000000100200190000003170000613d000000000101043b000000000001042d000000000100001900000325000104300000031c002104210000000102000039000000000001042d0000000002000019000000000001042d00000321002104230000000102000039000000000001042d0000000002000019000000000001042d0000032300000432000003240001042e00000325000104300000000000000000000000000000000000000000000000000000000000000000000000000000000000000000ffffffff00000000000000000000000000000000000000000000000000000001ffffffe000000000000000000000000000000000000000000000000000000000ffffffe0000000000000000000000000ffffffffffffffffffffffffffffffffffffffff020000000000000000000000000000000000002000000000000000000000000041492d456e61626c6520546f6b656e000000000000000000000000000000001e41494500000000000000000000000000000000000000000000000000000000060200000000000000000000000000000000000040000000000000000000000000ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef00000002000000000000000000000000000000400000010000000000000000004e487b7100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002400000000000000000000000000000000000000000000000000000000000000000000000000000000313ce5660000000000000000000000000000000000000000000000000000000095d89b400000000000000000000000000000000000000000000000000000000095d89b4100000000000000000000000000000000000000000000000000000000a9059cbb00000000000000000000000000000000000000000000000000000000dd62ed3e00000000000000000000000000000000000000000000000000000000313ce5670000000000000000000000000000000000000000000000000000000070a082310000000000000000000000000000000000000000000000000000000018160ddc0000000000000000000000000000000000000000000000000000000018160ddd0000000000000000000000000000000000000000000000000000000023b872dd0000000000000000000000000000000000000000000000000000000006fdde0300000000000000000000000000000000000000000000000000000000095ea7b300000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000020000000800000000000000000696e73756666696369656e7420616c6c6f77616e63650000000000000000000008c379a0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000064000000000000000000000000696e73756666696369656e742062616c616e63650000000000000000000000008c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00000000000000000000000000000000000000000000000000ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe00000000000000000000000000000000000000000000000000000000000000000a2646970667358221220b0b7ec05effba115d5d37f5decd8655bb6440bed78287bc750467d904c1ed48864736f6c63780d7a6b736f6c633a312e352e3135003e";

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
        await publicClient.waitForTransactionReceipt({ hash: hash as `0x${string}`, timeout: 60000 });
        updateLastTxLog({ message: "Token deployed! 1,000 AIE minted to AA account" });
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
