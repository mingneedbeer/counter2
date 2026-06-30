import { useState, useEffect, useRef } from "react";
import { createPublicClient, createWalletClient, custom, http, formatEther, parseEther, encodeFunctionData, encodeAbiParameters } from "viem";
import { toAccount } from "viem/accounts";
import { abstractTestnet, abstract } from "viem/chains";
import { encodeDeployData, sendEip712Transaction } from "viem/zksync";
import { createAbstractClient, getSmartAccountAddressFromInitialSigner, deployAccount } from "@abstract-foundation/agw-client";
import type { Address } from "viem";

const TOKEN_ABI = [{"inputs":[{"internalType":"string","name":"_name","type":"string"},{"internalType":"string","name":"_symbol","type":"string"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"owner","type":"address"},{"indexed":true,"internalType":"address","name":"spender","type":"address"},{"indexed":false,"internalType":"uint256","name":"value","type":"uint256"}],"name":"Approval","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"from","type":"address"},{"indexed":true,"internalType":"address","name":"to","type":"address"},{"indexed":false,"internalType":"uint256","name":"value","type":"uint256"}],"name":"Transfer","type":"event"},{"inputs":[{"internalType":"address","name":"","type":"address"},{"internalType":"address","name":"","type":"address"}],"name":"allowance","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"spender","type":"address"},{"internalType":"uint256","name":"value","type":"uint256"}],"name":"approve","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"balanceOf","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"decimals","outputs":[{"internalType":"uint8","name":"","type":"uint8"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"name","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"symbol","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"totalSupply","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"value","type":"uint256"}],"name":"transfer","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"from","type":"address"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"value","type":"uint256"}],"name":"transferFrom","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"}];;

const TOKEN_BYTECODE_RAW = "0x00080000000000020000008004000039000000400040043f0000006003100270000000f70330019700000001002001900000002f0000c13d000000040030008c0000004e0000413d000000000201043b000000e002200270000001050020009c000000f60000a13d000001060020009c0000018d0000a13d000001070020009c000001a10000613d000001080020009c000001da0000613d000001090020009c0000004e0000c13d0000000002000416000000000002004b0000004e0000c13d000000440030008c0000004e0000413d0000000402100370000000000202043b000000ff0020009c0000004e0000213d0000002401100370000000000101043b000000ff0010009c0000004e0000213d000000000020043f000800000001001d0000000401000039000000200010043f0000004002000039000000000100001903d803b90000040f0000000802000029000000000020043f000000200010043f000000000100001900000040020000390000019f0000013d0000000002000416000000000002004b0000004e0000c13d0000001f02300039000000f8022001970000008002200039000000400020043f0000001f0530018f000000f90630019800000080026000390000003f0000613d000000000701034f000000007807043c0000000004840436000000000024004b0000003b0000c13d000000000005004b0000004c0000613d000000000161034f0000000304500210000000000502043300000000054501cf000000000545022f000000000101043b0000010004400089000000000141022f00000000014101cf000000000151019f0000000000120435000000800030008c000000500000813d0000000001000019000003da00010430000000800400043d000000fa0040009c0000004e0000213d00000080013000390000009f02400039000000000012004b0000004e0000813d00000080024000390000000002020433000000fb0020009c000003080000813d0000001f05200039000000fc055001970000003f05500039000000fd05500197000000400800043d0000000005580019000000000085004b00000000060000390000000106004039000000fa0050009c000003080000213d0000000100600190000003080000c13d000000400050043f0000000009280436000000a0044000390000000005420019000000000015004b0000004e0000213d000000000002004b000000780000613d000000000500001900000000065900190000000007450019000000000707043300000000007604350000002005500039000000000025004b000000710000413d000000000282001900000020022000390000000000020435000000a00400043d000000fa0040009c0000004e0000213d0000001f02400039000000000032004b0000000003000019000000fe03008041000000fe02200197000000000002004b0000000005000019000000fe05004041000000fe0020009c000000000503c019000000000005004b0000004e0000c13d00000080024000390000000002020433000000fa0020009c000003080000213d0000001f03200039000000fc033001970000003f03300039000000fd03300197000000400600043d0000000003360019000000000063004b00000000050000390000000105004039000000fa0030009c000003080000213d0000000100500190000003080000c13d000000400030043f0000000007260436000000a0034000390000000004320019000000000014004b0000004e0000213d000000000002004b000000ab0000613d000000000100001900000000041700190000000005310019000000000505043300000000005404350000002001100039000000000021004b000000a40000413d000000000162001900000020011000390000000000010435000000c00300043d000000ff0030009c0000004e0000213d0000000001080433000000fa0010009c000003080000213d000800000001001d000700000009001d000600000008001d000000000100041a000000010210019000000001041002700000007f0440618f0000001f0040008c00000000010000390000000101002039000000000021004b000001c50000c13d000100000007001d000200000003001d000500000006001d000000e00100043d000300000001001d000400000004001d000000200040008c000000e30000413d000000000000043f0000000001000414000000f70010009c000000f701008041000000c00110021000000100011001c7000080100200003903d803d30000040f00000001002001900000004e0000613d00000008030000290000001f023000390000000502200270000000200030008c0000000002004019000000000301043b00000004010000290000001f01100039000000050110027000000000011300190000000002230019000000000012004b000000e30000813d000000000002041b0000000102200039000000000012004b000000df0000413d00000008010000290000001f0010008c000002da0000a13d000000000000043f0000000001000414000000f70010009c000000f701008041000000c00110021000000100011001c7000080100200003903d803d30000040f00000001002001900000004e0000613d00000008020000290000010102200198000000000101043b000002e70000c13d0000002003000039000002f40000013d0000010c0020009c000001410000213d0000010f0020009c000001b70000613d000001100020009c0000004e0000c13d0000000002000416000000000002004b0000004e0000c13d000000440030008c0000004e0000413d0000000402100370000000000202043b000800000002001d000000ff0020009c0000004e0000213d0000002401100370000000000101043b000700000001001d0000000001000411000000000010043f0000000401000039000000200010043f0000000001000414000000f70010009c000000f701008041000000c00110021000000102011001c7000080100200003903d803d30000040f00000001002001900000004e0000613d000000000101043b0000000802000029000000000020043f000000200010043f0000000001000414000000f70010009c000000f701008041000000c00110021000000102011001c7000080100200003903d803d30000040f00000001002001900000004e0000613d000000000101043b0000000702000029000000000021041b000000400100043d0000000000210435000000f70010009c000000f70100804100000040011002100000000002000414000000f70020009c000000f702008041000000c002200210000000000112019f00000100011001c70000800d02000039000000030300003900000119040000410000000005000411000000080600002903d803ce0000040f00000001002001900000004e0000613d000000400100043d00000001020000390000000000210435000000f70010009c000000f70100804100000040011002100000011a011001c7000003d90001042e0000010d0020009c000001cb0000613d0000010e0020009c0000004e0000c13d0000000002000416000000000002004b0000004e0000c13d000000640030008c0000004e0000413d0000000402100370000000000302043b000000ff0030009c0000004e0000213d0000002402100370000000000202043b000700000002001d000000ff0020009c0000004e0000213d0000004401100370000000000101043b000600000001001d000000000030043f0000000301000039000000200010043f0000000001000414000000f70010009c000000f701008041000000c00110021000000102011001c70000801002000039000800000003001d03d803d30000040f000000080300002900000001002001900000004e0000613d000000000101043b000000000101041a000000060010006c000001f80000413d000000000030043f0000000402000039000000200020043f0000000001000414000000f70010009c000000f701008041000000c00110021000000102011001c7000080100200003903d803d30000040f00000001002001900000004e0000613d000000000101043b0000000002000411000000000020043f000000200010043f0000000001000414000000f70010009c000000f701008041000000c00110021000000102011001c7000080100200003903d803d30000040f000000080300002900000001002001900000004e0000613d000000000101043b000000000101041a000000060010006c000002800000813d000000400100043d00000044021000390000011503000041000000000032043500000024021000390000001603000039000001fe0000013d0000010a0020009c000001d30000613d0000010b0020009c0000004e0000c13d0000000002000416000000000002004b0000004e0000c13d000000240030008c0000004e0000413d0000000401100370000000000101043b000000ff0010009c0000004e0000213d000000000010043f0000000301000039000000200010043f0000004002000039000000000100001903d803b90000040f000001cf0000013d0000000001000416000000000001004b0000004e0000c13d0000000103000039000000000203041a000000010520019000000001012002700000007f0410018f00000000010460190000001f0010008c00000000060000390000000106002039000000000626013f0000000100600190000001c50000c13d000000800010043f000000000005004b000002120000c13d0000011c01200197000000a00010043f000000000004004b0000020f0000013d0000000001000416000000000001004b0000004e0000c13d000000000200041a000000010420019000000001012002700000007f0310018f00000000010360190000001f0010008c00000000050000390000000105002039000000000525013f0000000100500190000002090000613d0000011301000041000000000010043f0000002201000039000000040010043f0000011401000041000003da000104300000000001000416000000000001004b0000004e0000c13d0000000201000039000000000101041a000000800010043f0000011101000041000003d90001042e0000000001000416000000000001004b0000004e0000c13d0000001201000039000000800010043f0000011101000041000003d90001042e0000000002000416000000000002004b0000004e0000c13d000000440030008c0000004e0000413d0000000402100370000000000202043b000800000002001d000000ff0020009c0000004e0000213d0000002401100370000000000101043b000700000001001d0000000001000411000000000010043f0000000301000039000000200010043f0000000001000414000000f70010009c000000f701008041000000c00110021000000102011001c7000080100200003903d803d30000040f00000001002001900000004e0000613d000000000101043b000000000101041a000000070010006c000002250000813d000000400100043d00000044021000390000011803000041000000000032043500000024021000390000001403000039000000000032043500000116020000410000000000210435000000040210003900000020030000390000000000320435000000f70010009c000000f701008041000000400110021000000117011001c7000003da00010430000000800010043f000000000004004b000002200000c13d0000011c01200197000000a00010043f000000000003004b000000c001000039000000a001006039000002470000013d000000000030043f000000020020008c000002230000413d000001120200004100000000040000190000000003040019000000000402041a000000a005300039000000000045043500000001022000390000002004300039000000000014004b000002170000413d000002460000013d000000000000043f000000020020008c0000023c0000813d000000a001000039000002470000013d0000000001000411000000000010043f0000000301000039000000200010043f0000000001000414000000f70010009c000000f701008041000000c00110021000000102011001c7000080100200003903d803d30000040f00000001002001900000004e0000613d000000000101043b000000000201041a000000070220006c0000025c0000813d0000011301000041000000000010043f0000001101000039000000040010043f0000011401000041000003da000104300000011b0200004100000000040000190000000003040019000000000402041a000000a005300039000000000045043500000001022000390000002004300039000000000014004b0000023e0000413d000000c001300039000000610110008a0000011d0010009c000003080000213d0000011e011001970000008001100039000000fa0010009c000003080000213d000000400010043f0000008002000039000800000001001d03d803a40000040f00000008020000290000000001210049000000f70010009c000000f7010080410000006001100210000000f70020009c000000f7020080410000004002200210000000000121019f000003d90001042e000000000021041b0000000801000029000000000010043f0000000301000039000000200010043f0000000001000414000000f70010009c000000f701008041000000c00110021000000102011001c7000080100200003903d803d30000040f00000001002001900000004e0000613d000000000101043b000000000201041a0000000703000029000000000032001a000002360000413d0000000002320019000000000021041b000000400100043d0000000000310435000000f70010009c000000f70100804100000040011002100000000002000414000000f70020009c000000f702008041000000c002200210000000000112019f00000100011001c70000800d0200003900000003030000390000010304000041000001340000013d000000000030043f0000000301000039000000200010043f0000000001000414000000f70010009c000000f701008041000000c00110021000000102011001c7000080100200003903d803d30000040f000000010020019000000006030000290000004e0000613d000000000101043b000000000201041a000000000232004b000002360000413d000000000021041b0000000701000029000000000010043f0000000301000039000000200010043f0000000001000414000000f70010009c000000f701008041000000c00110021000000102011001c7000080100200003903d803d30000040f000000010020019000000006030000290000004e0000613d000000000101043b000000000201041a000000000032001a000002360000413d0000000602200029000000000021041b0000000801000029000000000010043f0000000401000039000000200010043f0000000001000414000000f70010009c000000f701008041000000c00110021000000102011001c7000080100200003903d803d30000040f00000001002001900000004e0000613d000000000101043b0000000002000411000000000020043f000000200010043f0000000001000414000000f70010009c000000f701008041000000c00110021000000102011001c7000080100200003903d803d30000040f00000001002001900000004e0000613d000000000101043b000000000201041a000000060220006c000002360000413d000000000021041b000000400100043d00000006020000290000000000210435000000f70010009c000000f70100804100000040011002100000000002000414000000f70020009c000000f702008041000000c002200210000000000112019f00000100011001c70000800d02000039000000030300003900000103040000410000000805000029000000070600002903d803ce0000040f0000000100200190000001390000c13d0000004e0000013d000000080000006b0000000001000019000002df0000613d00000007010000290000000001010433000000080400002900000003024002100000011f0220027f0000011f02200167000000000121016f0000000102400210000000000121019f000003020000013d000000010320008a0000000503300270000000000431001900000020030000390000000104400039000000060600002900000000056300190000000005050433000000000051041b00000020033000390000000101100039000000000041004b000002ed0000c13d000000080020006c000002ff0000613d00000008020000290000000302200210000000f80220018f0000011f0220027f0000011f0220016700000006033000290000000003030433000000000223016f000000000021041b0000000801000029000000010110021000000001011001bf000000000010041b00000005010000290000000001010433000800000001001d000000fa0010009c0000030e0000a13d0000011301000041000000000010043f0000004101000039000000040010043f0000011401000041000003da000104300000000101000039000000000101041a000000010010019000000001021002700000007f0220618f000700000002001d0000001f0020008c00000000020000390000000102002039000000000112013f0000000100100190000001c50000c13d0000000701000029000000200010008c000003390000413d0000000101000039000000000010043f0000000001000414000000f70010009c000000f701008041000000c00110021000000100011001c7000080100200003903d803d30000040f00000001002001900000004e0000613d00000008030000290000001f023000390000000502200270000000200030008c0000000002004019000000000301043b00000007010000290000001f01100039000000050110027000000000011300190000000002230019000000000012004b000003390000813d000000000002041b0000000102200039000000000012004b000003350000413d00000008010000290000001f0010008c0000034d0000a13d0000000101000039000000000010043f0000000001000414000000f70010009c000000f701008041000000c00110021000000100011001c7000080100200003903d803d30000040f00000001002001900000004e0000613d00000008020000290000010102200198000000000101043b0000035a0000c13d0000002003000039000003670000013d000000080000006b0000000001000019000003520000613d00000001010000290000000001010433000000080400002900000003024002100000011f0220027f0000011f02200167000000000121016f0000000102400210000000000121019f000003750000013d000000010320008a0000000503300270000000000431001900000020030000390000000104400039000000050600002900000000056300190000000005050433000000000051041b00000020033000390000000101100039000000000041004b000003600000c13d000000080020006c000003720000613d00000008020000290000000302200210000000f80220018f0000011f0220027f0000011f0220016700000005033000290000000003030433000000000223016f000000000021041b0000000801000029000000010110021000000001011001bf0000000202000029000000ff032001970000000102000039000000000012041b00000002010000390000000302000029000000000021041b000800000003001d000000000030043f0000000301000039000000200010043f0000000001000414000000f70010009c000000f701008041000000c00110021000000102011001c7000080100200003903d803d30000040f00000001002001900000004e0000613d000000000101043b0000000302000029000000000021041b000000400100043d0000000000210435000000f70010009c000000f70100804100000040011002100000000002000414000000f70020009c000000f702008041000000c002200210000000000121019f00000100011001c70000800d02000039000000030300003900000103040000410000000005000019000000080600002903d803ce0000040f00000001002001900000004e0000613d0000002001000039000001000010044300000120000004430000010401000041000003d90001042e00000020030000390000000004310436000000003202043400000000002404350000004001100039000000000002004b000003b30000613d000000000400001900000000054100190000000006430019000000000606043300000000006504350000002004400039000000000024004b000003ac0000413d000000000321001900000000000304350000001f022000390000011e022001970000000001210019000000000001042d000000f70010009c000000f7010080410000004001100210000000f70020009c000000f7020080410000006002200210000000000112019f0000000002000414000000f70020009c000000f702008041000000c002200210000000000112019f00000120011001c7000080100200003903d803d30000040f0000000100200190000003cc0000613d000000000101043b000000000001042d0000000001000019000003da00010430000003d1002104210000000102000039000000000001042d0000000002000019000000000001042d000003d6002104230000000102000039000000000001042d0000000002000019000000000001042d000003d800000432000003d90001042e000003da00010430000000000000000000000000000000000000000000000000000000000000000000000000ffffffff00000000000000000000000000000000000000000000000000000001ffffffe000000000000000000000000000000000000000000000000000000000ffffffe0000000000000000000000000000000000000000000000000ffffffffffffffff0000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000001ffffffffffffffe0000000000000000000000000000000000000000000000003ffffffffffffffe08000000000000000000000000000000000000000000000000000000000000000000000000000000000000000ffffffffffffffffffffffffffffffffffffffff0200000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000000000000000ffffffffffffffe00200000000000000000000000000000000000040000000000000000000000000ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef000000020000000000000000000000000000004000000100000000000000000000000000000000000000000000000000000000000000000000000000313ce5660000000000000000000000000000000000000000000000000000000095d89b400000000000000000000000000000000000000000000000000000000095d89b4100000000000000000000000000000000000000000000000000000000a9059cbb00000000000000000000000000000000000000000000000000000000dd62ed3e00000000000000000000000000000000000000000000000000000000313ce5670000000000000000000000000000000000000000000000000000000070a082310000000000000000000000000000000000000000000000000000000018160ddc0000000000000000000000000000000000000000000000000000000018160ddd0000000000000000000000000000000000000000000000000000000023b872dd0000000000000000000000000000000000000000000000000000000006fdde0300000000000000000000000000000000000000000000000000000000095ea7b30000000000000000000000000000000000000020000000800000000000000000b10e2d527612073b26eecdfd717e6a320cf44b4afac2b0732d9fcbe2b7fa0cf64e487b71000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000024000000000000000000000000696e73756666696369656e7420616c6c6f77616e63650000000000000000000008c379a0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000064000000000000000000000000696e73756666696369656e742062616c616e63650000000000000000000000008c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b9250000000000000000000000000000000000000020000000000000000000000000290decd9548b62a8d60345a988386fc84ba6bc95484008f6362f93160ef3e563ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe0ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff02000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000a264697066735822122051f2a030d78b1084afa2fa0523d970b1071aa09252834c071a0d2ef6eede97e264736f6c6378247a6b736f6c633a312e352e31353b736f6c633a302e382e32343b6c6c766d3a312e302e320055";

const checkIsDeployed = (publicClient: ReturnType<typeof createPublicClient>, address: Address) =>
  publicClient.getCode({ address }).then((code) => code !== "0x" && code !== undefined);

const TOKEN_SOURCE = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract AIEnableToken {
    string public name;
    string public symbol;
    uint8 public constant decimals = 18;
    uint256 public totalSupply;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    constructor(string memory _name, string memory _symbol, address to, uint256 amount) {
        name = _name;
        symbol = _symbol;
        totalSupply = amount;
        balanceOf[to] = amount;
        emit Transfer(address(0), to, amount);
    }

    function approve(address spender, uint256 value) public returns (bool) {
        allowance[msg.sender][spender] = value;
        emit Approval(msg.sender, spender, value);
        return true;
    }

    function transfer(address to, uint256 value) public returns (bool) {
        require(balanceOf[msg.sender] >= value, "insufficient balance");
        balanceOf[msg.sender] -= value;
        balanceOf[to] += value;
        emit Transfer(msg.sender, to, value);
        return true;
    }

    function transferFrom(address from, address to, uint256 value) public returns (bool) {
        require(balanceOf[from] >= value, "insufficient balance");
        require(allowance[from][msg.sender] >= value, "insufficient allowance");
        balanceOf[from] -= value;
        balanceOf[to] += value;
        allowance[from][msg.sender] -= value;
        emit Transfer(from, to, value);
    }
}`;

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

  const verifyContract = async (address: Address, _name: string, _symbol: string, to: Address, amount: bigint) => {
    const verifyUrl = chain === "abstract"
      ? "https://api-explorer-verify.abs.xyz/contract_verification"
      : "https://api-explorer-verify.testnet.abs.xyz/contract_verification";
    const standardJson = {
      language: "Solidity",
      sources: {
        "contracts/AIEnableToken.sol": {
          content: TOKEN_SOURCE,
        },
      },
      settings: {
        evmVersion: "paris",
        optimizer: { enabled: true, mode: "3" },
        outputSelection: {
          "*": {
            "*": ["abi", "evm.methodIdentifiers", "metadata"],
            "": ["ast"],
          },
        },
        detectMissingLibraries: false,
        forceEVMLA: false,
        enableEraVMExtensions: false,
        libraries: {},
      },
    };

    const encodedArgs = encodeAbiParameters(
      [
        { type: "string", name: "_name" },
        { type: "string", name: "_symbol" },
        { type: "address", name: "to" },
        { type: "uint256", name: "amount" },
      ],
      [_name, _symbol, to, amount]
    );

    const payload = {
      contractAddress: address.toLowerCase(),
      sourceCode: standardJson,
      codeFormat: "solidity-standard-json-input",
      contractName: "contracts/AIEnableToken.sol:AIEnableToken",
      compilerSolcVersion: "zkVM-0.8.24-1.0.2",
      compilerZksolcVersion: "v1.5.15",
      constructorArguments: encodedArgs,
      optimizationUsed: true,
    };

    const response = await fetch(verifyUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return await response.json();
  };

  const deployToken = async () => {
    if (!wallet) return;
    setLoading(true);
    addTxLog({ action: "Token", hash: "", status: "pending", message: "Sign deployment in MetaMask..." });
      try {
      const data = encodeDeployData({
        abi: TOKEN_ABI,
        bytecode: TOKEN_BYTECODE_RAW,
        args: [`AI-Enable Token (${userEmail || wallet.eoa.slice(0, 6)})`, "AIE", wallet.aaAddress, parseEther("1000")],
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
          updateLastTxLog({ message: `Token deployed at ${receipt.contractAddress} — verifying...` });
          await loadTokenBalance();
          try {
            const verifyResult = await verifyContract(
              receipt.contractAddress,
              `AI-Enable Token (${userEmail || wallet.eoa.slice(0, 6)})`,
              "AIE",
              wallet.aaAddress,
              parseEther("1000")
            );
            if (verifyResult?.status === "success" || verifyResult?.id) {
              updateLastTxLog({ message: `Token deployed and verified! ID: ${verifyResult.id}` });
            } else {
              updateLastTxLog({ message: `Token deployed — verification submitted (${verifyResult?.message || JSON.stringify(verifyResult)})` });
            }
          } catch (e) {
            updateLastTxLog({ message: `Token deployed — verification request failed (verify manually)` });
          }
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
