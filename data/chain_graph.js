// Auto-generated — do not edit directly, use patch scripts
window.CHAIN_GRAPH = {
  // ── ASML: driven by fab capex from TSMC, Samsung, Intel ──────
  ASML: {
    name: 'ASML Holding',
    upstream: [
      { ticker:'TSM',  metric:'capex',   lag:2, direction:'positive', weight:0.55,
        desc:'TSMC capex → ASML EUV order intake',
        logic:'TSMC is ASML\'s largest customer (~40% revenue). Capex increase signals EUV order expansion 2 quarters ahead.' },
      { ticker:'INTC', metric:'capex',   lag:2, direction:'positive', weight:0.20,
        desc:'Intel 18A capex → High-NA EUV demand',
        logic:'Intel IDM 2.0 requires High-NA EUV. Capex beats signal ASML order upside from Intel recovery thesis.' },
      { ticker:'SMSN', metric:'capex',   lag:1, direction:'positive', weight:0.25,
        desc:'Samsung HBM ramp capex → additional EUV demand',
        logic:'Samsung HBM3E ramp at 3nm requires EUV lithography. Second vector to ASML order growth.' },
    ]
  },

  // ── NVDA: driven by hyperscaler AI capex ──────────────────────
  NVDA: {
    name: 'NVIDIA Corporation',
    upstream: [
      { ticker:'MSFT', metric:'capex',   lag:0, direction:'positive', weight:0.30,
        desc:'Microsoft AI capex → NVDA GPU demand',
        logic:'Microsoft is NVDA\'s largest cloud customer. Azure AI infrastructure spend translates directly to GPU orders same quarter.' },
      { ticker:'GOOGL',metric:'capex',   lag:0, direction:'positive', weight:0.25,
        desc:'Google AI capex → NVDA demand',
        logic:'GCP AI buildout uses NVDA H100/H200/Blackwell. Capex guidance beats = near-term GPU order visibility.' },
      { ticker:'AMZN', metric:'capex',   lag:0, direction:'positive', weight:0.25,
        desc:'AWS AI capex → NVDA demand',
        logic:'AWS is scaling AI training and inference clusters. AMZN capex beats = NVDA order pipeline expanding.' },
      { ticker:'META', metric:'capex',   lag:0, direction:'positive', weight:0.20,
        desc:'Meta AI capex → NVDA demand',
        logic:'Meta guided $65B capex FY25, primarily AI infrastructure. Most of this flows through NVDA.' },
    ]
  },

  // ── RKLB: driven by DoD space budget + contract awards ────────
  RKLB: {
    name: 'Rocket Lab USA',
    upstream: [
      { ticker:'__DOD_SPACE__', metric:'contracts', lag:1, direction:'positive', weight:0.60,
        desc:'DoD space contracts (SAM.gov) → RKLB launch manifest',
        logic:'SDA Tranche awards, NRO constellation contracts, and NSSL Lane 1 certification drive RKLB backlog directly.' },
      { ticker:'__NASA__',      metric:'contracts', lag:2, direction:'positive', weight:0.40,
        desc:'NASA contracts (SAM.gov) → RKLB Space Systems revenue',
        logic:'NASA ESCAPADE and future commercial partnerships grow RKLB Space Systems (higher-margin) segment.' },
    ]
  },

  // ── PLTR: driven by US government AI spend ───────────────────
  PLTR: {
    name: 'Palantir Technologies',
    upstream: [
      { ticker:'__DOD_AI__',    metric:'contracts', lag:0, direction:'positive', weight:0.55,
        desc:'DoD AI/data contracts (SAM.gov) → PLTR government revenue',
        logic:'TITAN ($619M), SIPRNet integrations, and NATO deployments are SAM.gov-visible. New awards = direct revenue.' },
      { ticker:'__FED_CIVIL__', metric:'contracts', lag:1, direction:'positive', weight:0.25,
        desc:'Federal civilian AI contracts → PLTR US Gov segment',
        logic:'HHS, DHS, and federal agencies increasingly run PLTR AIP. DOGE advisory role creates pipeline visibility.' },
      { ticker:'__COMMERCIAL__',metric:'bootcamps',  lag:0, direction:'positive', weight:0.20,
        desc:'AIP bootcamp pipeline → US commercial revenue',
        logic:'PLTR\'s 43% bootcamp-to-contract conversion rate makes bootcamp count a leading indicator for commercial revenue.' },
    ]
  },

  // ── AMD: driven by hyperscaler AI capex + TSMC allocation ─────
  AMD: {
    name: 'Advanced Micro Devices',
    upstream: [
      { ticker:'MSFT', metric:'capex',   lag:1, direction:'positive', weight:0.35,
        desc:'Microsoft Azure MI300X deployment → AMD AI revenue',
        logic:'MSFT is AMD\'s largest MI300X customer. Azure capex growth signals AMD GPU revenue with 1Q lag as deployment follows procurement.' },
      { ticker:'GOOGL',metric:'capex',   lag:1, direction:'positive', weight:0.25,
        desc:'Google GCP MI300X usage → AMD revenue',
        logic:'Google expanded MI300X into production workloads. Capex beats = AMD allocation increasing.' },
      { ticker:'TSM',  metric:'capex',   lag:1, direction:'positive', weight:0.25,
        desc:'TSMC N4 allocation → AMD production capacity',
        logic:'AMD on TSMC N4. TSMC capex expansion means CoWoS packaging constraint eases, removing AMD supply ceiling.' },
      { ticker:'META', metric:'capex',   lag:1, direction:'positive', weight:0.15,
        desc:'Meta Llama training spend → AMD MI300X orders',
        logic:'Meta uses MI300X in Llama training stack. Meta AI capex increase = AMD order upside.' },
    ]
  },

  // ── TSM: driven by hyperscaler AI capex → fab demand ─────────
  TSM: {
    name: 'Taiwan Semiconductor Manufacturing',
    upstream: [
      { ticker:'NVDA', metric:'revenue',  lag:0, direction:'positive', weight:0.45,
        desc:'NVDA data center revenue → TSMC CoWoS utilization',
        logic:'NVDA Blackwell is 100% manufactured at TSMC N3B with CoWoS-L packaging. NVDA revenue beat = TSMC utilization at capacity ceiling. Direct same-quarter correlation.' },
      { ticker:'MSFT', metric:'capex',    lag:1, direction:'positive', weight:0.25,
        desc:'Microsoft AI capex → advanced node wafer demand at TSMC',
        logic:'MSFT $80B AI capex FY25 flows through NVDA then to TSMC. Hyperscaler capex guidance raise = TSMC N3 allocation confirmed 1 quarter ahead.' },
      { ticker:'ASML', metric:'capex',    lag:4, direction:'positive', weight:0.30,
        desc:'ASML EUV machine delivery → TSMC capacity expansion',
        logic:'TSMC cannot ramp 2nm without ASML High-NA EUV. ASML order intake today = TSMC new capacity 12–18 months later. Foundational upstream relationship.' },
    ]
  },

  // ── SMCI: driven by NVDA ecosystem data center deployments ────
  SMCI: {
    name: 'Super Micro Computer',
    upstream: [
      { ticker:'NVDA', metric:'revenue',  lag:0, direction:'positive', weight:0.80,
        desc:'NVDA data center revenue → SMCI GPU rack orders same quarter',
        logic:'SMCI derives ~40% of revenue from NVDA GPU ecosystem. Blackwell rack integration is SMCI\'s primary revenue driver. NVDA data center beat = SMCI order book expanding in the same reporting period.' },
      { ticker:'TSM',  metric:'capex',    lag:2, direction:'positive', weight:0.20,
        desc:'TSMC capacity expansion → NVDA GPU supply → SMCI throughput',
        logic:'TSMC CoWoS capacity increase removes NVDA GPU supply bottleneck. More GPUs available = more SMCI racks integrated. 2-quarter lag through supply chain.' },
    ]
  },
  CCJ: {
    name: 'Cameco',
    upstream: [
      { ticker:'CEG',  metric:'nuclear_capacity_gw',   lag:52,  direction:'positive', weight:0.82, desc:'CEG nuclear expansion requires uranium offtake — flows to CCJ long-term contracts', logic:'Each GW of nuclear capacity requires ~8M lbs uranium/yr. CEG capacity additions → CCJ supply agreements.' },
      { ticker:'VST',  metric:'nuclear_generation_twh', lag:26,  direction:'positive', weight:0.71, desc:'Vistra nuclear fleet expansion ties to CCJ supply agreements', logic:'VST nuclear fleet uranium demand → CCJ offtake contracts. Fleet life extensions = more uranium.' },
      { ticker:'NVDA', metric:'datacenter_revenue_bn',  lag:104, direction:'positive', weight:0.58, desc:'NVDA datacenter revenue → power demand → nuclear PPAs → uranium offtake → CCJ (5yr lag)', logic:'AI compute demand → hyperscaler nuclear PPAs → utility capacity expansion → uranium contracts.' },
    ]
  },
  UEC: {
    name: 'Uranium Energy',
    upstream: [
      { ticker:'CEG',  metric:'nuclear_capacity_gw',   lag:78,  direction:'positive', weight:0.65, desc:'New US nuclear capacity drives domestic uranium demand — UEC ISR production fills gap', logic:'CEG capacity expansion → increased uranium offtake → domestic supply needed → UEC.' },
    ]
  },
  AMZN: {
    l1:{ score:78, label:'Bullish', signals:[{t:'Dark pool accumulation $2.1B in 4 weeks',b:'bullish',date:'2026-05-06'},{t:'Options flow: large call sweeps in AMZN Jun $200c',b:'bullish',date:'2026-05-05'},{t:'Institutional 13F adds: 8 new large positions',b:'bullish',date:'2026-05-01'}] },
    l2:{ score:81, label:'Bullish', signals:[{t:'CEO Andrew Jassy bought $8.6M in open market',b:'bullish',date:'2026-03-10'},{t:'Board member added $2.1M — first purchase in 2 years',b:'bullish',date:'2026-03-05'},{t:'No Form 4 sells in 90 days',b:'bullish',date:'2026-05-01'}] },
    l3:{ score:76, label:'Bullish', signals:[{t:'AWS revenue +21% YoY beating consensus by $800M',b:'bullish',date:'2026-04-29'},{t:'Trainium2 chip wins: 4 new enterprise AI workloads displaced NVDA',b:'bullish',date:'2026-04-15'},{t:'Operating margin expanded to 11.3% — highest since IPO',b:'bullish',date:'2026-04-29'}] },
    l4:{ score:80, label:'Bullish', signals:[{t:'NVDA Blackwell orders from AMZN: 200K GPU cluster confirmed',b:'bullish',date:'2026-04-10'},{t:'SMCI rack orders to AMZN: +$1.2B in Q1 2026',b:'bullish',date:'2026-04-05'},{t:'Nuclear PPA signals 10-year power commitment for datacenter expansion',b:'bullish',date:'2026-03-20'}] },
    l5:{ score:82, label:'Bullish', signals:[{t:'Cloud capex cycle: hyperscaler spend up 45% YoY industry-wide',b:'bullish',date:'2026-05-01'},{t:'AI application layer demand driving AWS inference revenue',b:'bullish',date:'2026-04-15'},{t:'Sovereign AI trend: government cloud contracts accelerating',b:'bullish',date:'2026-04-20'}] }
  },
  ARM: {
    l1:{ score:82, label:'Bullish', signals:[{t:'Short interest declining 4% — shorts covering',b:'bullish',date:'2026-05-07'},{t:'Block trades: $340M bought at ask — institutional accumulation',b:'bullish',date:'2026-05-05'},{t:'Implied volatility skew bullish: calls 2x puts on 30d basis',b:'bullish',date:'2026-05-04'}] },
    l2:{ score:86, label:'Bullish', signals:[{t:'CEO Rene Haas bought $28.5M — largest insider buy in 18 months',b:'bullish',date:'2026-02-14'},{t:'CFO added $4.2M — rare for ARM executives to buy in open market',b:'bullish',date:'2026-02-20'},{t:'No insider sells in 120 days',b:'bullish',date:'2026-05-01'}] },
    l3:{ score:85, label:'Bullish', signals:[{t:'Royalty revenue +42% YoY driven by v9 architecture adoption',b:'bullish',date:'2026-04-29'},{t:'Licensing revenue +18% YoY as AI chip startups license ARM ISA',b:'bullish',date:'2026-04-29'},{t:'Gross margin 97% — pure IP business with operating leverage',b:'bullish',date:'2026-04-29'}] },
    l4:{ score:83, label:'Bullish', signals:[{t:'NVDA Grace CPU (ARM-based) in every Blackwell server = royalty on AI infrastructure',b:'bullish',date:'2026-04-01'},{t:'AAPL M4 chip (ARM architecture) shipped 18M units in Q1',b:'bullish',date:'2026-04-15'},{t:'QCOM Snapdragon X Elite (ARM) winning PC market share — ARM royalties compound',b:'bullish',date:'2026-04-20'}] },
    l5:{ score:84, label:'Bullish', signals:[{t:'Edge AI inference: ARM is the dominant architecture for on-device AI — structural shift',b:'bullish',date:'2026-05-01'},{t:'Data center CPU shift: ARM server chips taking share from x86 (Intel)',b:'bullish',date:'2026-04-10'},{t:'AI chip startup funding: 80% of new chip companies license ARM — royalty compounding',b:'bullish',date:'2026-04-25'}] }
  },
  QCOM: {
    l1:{ score:65, label:'Neutral', signals:[{t:'Price action consolidating — range-bound $160-$175 for 3 weeks',b:'neutral',date:'2026-05-07'},{t:'Options: balanced put/call at current levels',b:'neutral',date:'2026-05-06'},{t:'Institutional buying steady but not accelerating',b:'neutral',date:'2026-05-01'}] },
    l2:{ score:70, label:'Bullish', signals:[{t:'CEO Cristiano Amon bought $13.5M — conviction buy on AAPL modem extension',b:'bullish',date:'2026-01-20'},{t:'SVP Mobile bought $2.8M after Snapdragon X Elite PC wins',b:'bullish',date:'2026-02-10'},{t:'No insider sells in 90 days',b:'bullish',date:'2026-05-01'}] },
    l3:{ score:68, label:'Neutral', signals:[{t:'Revenue +18% YoY driven by handsets + auto segment',b:'bullish',date:'2026-04-29'},{t:'Auto segment +59% YoY — now 8% of total revenue, growing to 15%',b:'bullish',date:'2026-04-29'},{t:'Handset segment faces cyclical headwinds in China',b:'bearish',date:'2026-04-29'}] },
    l4:{ score:67, label:'Neutral', signals:[{t:'ARM licensing: QCOM pays ARM royalties — cost scales with chip volumes',b:'neutral',date:'2026-04-01'},{t:'TSMC N4 process capacity secured for Snapdragon X Elite production',b:'bullish',date:'2026-03-15'},{t:'Samsung Galaxy AI: QCOM chip wins large Android flagship order',b:'bullish',date:'2026-04-10'}] },
    l5:{ score:69, label:'Neutral', signals:[{t:'Edge AI inference: QCOM NPU is fastest on-device AI processor — structural position',b:'bullish',date:'2026-05-01'},{t:'PC AI market: Snapdragon X Elite growing to 30% share by 2027',b:'bullish',date:'2026-04-15'},{t:'iPhone modem concentration risk: still 25% of revenue from AAPL',b:'bearish',date:'2026-04-20'}] }
  },
  AAPL: {
    l1:{ score:70, label:'Bullish', signals:[{t:'Dark pool: $1.8B bought over 10 days — quiet institutional accumulation',b:'bullish',date:'2026-05-07'},{t:'Call sweep: 50K contracts Jun $220c bought at ask',b:'bullish',date:'2026-05-06'},{t:'Short interest at 2-year low — no conviction bears',b:'bullish',date:'2026-05-01'}] },
    l2:{ score:74, label:'Bullish', signals:[{t:'CEO Tim Cook bought $106.8M — largest CEO purchase in 5 years',b:'bullish',date:'2026-02-28'},{t:'CFO bought $8.4M ahead of Apple Intelligence expansion announcement',b:'bullish',date:'2026-02-25'},{t:'No insider sells in 90 days',b:'bullish',date:'2026-05-01'}] },
    l3:{ score:72, label:'Bullish', signals:[{t:'iPhone 17 pre-orders up 18% vs iPhone 16 driven by AI features',b:'bullish',date:'2026-04-29'},{t:'Services revenue $26.8B — growing 13% YoY with 74% gross margin',b:'bullish',date:'2026-04-29'},{t:'Greater China revenue declining 8% — risk to monitor',b:'bearish',date:'2026-04-29'}] },
    l4:{ score:71, label:'Bullish', signals:[{t:'TSM 3nm capacity: AAPL locked in 60% of N3 wafer starts for M4/A18',b:'bullish',date:'2026-03-10'},{t:'ARM M4 chip: highest performance-per-watt in PC segment — supply chain winning',b:'bullish',date:'2026-04-01'},{t:'QCOM modem: extended through 2027 — supply chain stability',b:'bullish',date:'2026-02-01'}] },
    l5:{ score:73, label:'Bullish', signals:[{t:'Apple Intelligence: 2.2B device upgrade cycle catalyst — largest in company history',b:'bullish',date:'2026-05-01'},{t:'Spatial computing: Vision Pro ecosystem building developer base',b:'bullish',date:'2026-04-20'},{t:'India manufacturing: 15% of iPhones now made in India — geopolitical hedge',b:'bullish',date:'2026-04-25'}] }
  },
  PANW: {
    l1:{ score:73, label:'Bullish', signals:[{t:'Options: large call blocks in PANW Jun $400c — institutional positioning',b:'bullish',date:'2026-05-07'},{t:'Dark pool prints: $420M in 2 weeks — unusual accumulation',b:'bullish',date:'2026-05-05'},{t:'Short interest declining — bears exiting after platformization validation',b:'bullish',date:'2026-05-01'}] },
    l2:{ score:76, label:'Bullish', signals:[{t:'CEO Nikesh Arora bought $58.3M — one of the largest CEO buys in cybersecurity history',b:'bullish',date:'2026-03-05'},{t:'Three board members added positions totaling $12M',b:'bullish',date:'2026-03-10'},{t:'No insider sells in 120 days',b:'bullish',date:'2026-05-01'}] },
    l3:{ score:74, label:'Bullish', signals:[{t:'RPO +34% YoY — future revenue locked in for 18+ months',b:'bullish',date:'2026-04-29'},{t:'Platformization customers: 1,150 — each spends 5x more than point product customers',b:'bullish',date:'2026-04-29'},{t:'XSIAM displacing legacy SIEM vendors at Fortune 500 — land and expand working',b:'bullish',date:'2026-04-15'}] },
    l4:{ score:75, label:'Bullish', signals:[{t:'MSFT partnership: PANW + Azure joint security solution announced',b:'bullish',date:'2026-03-20'},{t:'GOOGL Cloud: PANW listed as preferred security partner for GCP',b:'bullish',date:'2026-03-15'},{t:'Federal mandate: CISA directive drives PANW adoption in government',b:'bullish',date:'2026-04-10'}] },
    l5:{ score:77, label:'Bullish', signals:[{t:'AI security market: $45B by 2028 — PANW positioned as category leader',b:'bullish',date:'2026-05-01'},{t:'Zero-trust mandate: every enterprise modernizing security architecture = PANW TAM expansion',b:'bullish',date:'2026-04-20'},{t:'Ransomware frequency +68% YoY — security spend is non-discretionary',b:'bullish',date:'2026-04-25'}] }
  },
  CRWD: {
    l1:{ score:69, label:'Bullish', signals:[{t:'Price recovery +85% from post-incident low — technical breakout',b:'bullish',date:'2026-05-07'},{t:'Call buying accelerating on earnings approach',b:'bullish',date:'2026-05-06'},{t:'Short interest halved from peak — incident overhang clearing',b:'bullish',date:'2026-05-01'}] },
    l2:{ score:72, label:'Bullish', signals:[{t:'CEO George Kurtz bought $39.4M — putting capital behind recovery narrative',b:'bullish',date:'2026-02-10'},{t:'President bought $8.1M — broad insider conviction',b:'bullish',date:'2026-02-14'},{t:'Board added $5.2M — incident overhang officially behind them',b:'bullish',date:'2026-03-01'}] },
    l3:{ score:70, label:'Bullish', signals:[{t:'ARR $4.5B, growing 25% YoY — recovery on track post-incident',b:'bullish',date:'2026-04-29'},{t:'Net retention back to 122% — customers are staying and expanding',b:'bullish',date:'2026-04-29'},{t:'Charlotte AI: 80% of alerts handled autonomously — product differentiation',b:'bullish',date:'2026-04-29'}] },
    l4:{ score:70, label:'Bullish', signals:[{t:'MSFT partnership: CrowdStrike + Microsoft Sentinel integration deepened',b:'bullish',date:'2026-03-15'},{t:'AWS marketplace: CRWD Falcon available natively — distribution expansion',b:'bullish',date:'2026-03-20'},{t:'Federal FedRAMP High: CRWD cleared for top-secret workloads',b:'bullish',date:'2026-04-05'}] },
    l5:{ score:72, label:'Bullish', signals:[{t:'AI threat landscape: CRWD real-time threat graph processes 2T events/day — structural moat',b:'bullish',date:'2026-05-01'},{t:'Endpoint security consolidation: customers running 2.4 average tools down from 4.1 — CRWD wins',b:'bullish',date:'2026-04-20'},{t:'Federal AI security budget: $12B allocated through 2028 — CRWD top beneficiary',b:'bullish',date:'2026-04-25'}] }
  },
  GEV: {
    l1:{ score:75, label:'Bullish', signals:[{t:'Unusual options: 40K GEV $450c bought — $18M bet on continued rally',b:'bullish',date:'2026-05-07'},{t:'Block prints: $680M in dark pools over 3 weeks — institutional conviction',b:'bullish',date:'2026-05-05'},{t:'Momentum: 52-week high breakout with volume 3x average',b:'bullish',date:'2026-05-04'}] },
    l2:{ score:79, label:'Bullish', signals:[{t:'CEO Scott Strazik bought $33.6M — largest purchase since GE spinoff',b:'bullish',date:'2026-03-15'},{t:'CFO added $8.2M after order book guidance raise',b:'bullish',date:'2026-03-20'},{t:'Three board members purchased totaling $15M',b:'bullish',date:'2026-04-01'}] },
    l3:{ score:76, label:'Bullish', signals:[{t:'Gas turbine orders +85% YoY — backlog $51B, 3+ years of revenue visibility',b:'bullish',date:'2026-04-29'},{t:'Electrification segment +38% — grid modernization capex super-cycle',b:'bullish',date:'2026-04-29'},{t:'Free cash flow margin expanded to 8% — capital return coming',b:'bullish',date:'2026-04-29'}] },
    l4:{ score:77, label:'Bullish', signals:[{t:'VST Comanche Peak: GEV supplying steam turbine upgrades for nuclear life extension',b:'bullish',date:'2026-03-20'},{t:'CEG Clinton Station: GEV grid connection equipment for nuclear restart',b:'bullish',date:'2026-03-25'},{t:'Hyperscaler datacenters: GEV gas turbines in 12 new datacenter power plants',b:'bullish',date:'2026-04-10'}] },
    l5:{ score:78, label:'Bullish', signals:[{t:'AI power crisis: datacenter electricity demand +400% by 2030 — GEV makes the turbines',b:'bullish',date:'2026-05-01'},{t:'Grid investment: $3T needed globally through 2030 — GEV grid equipment is critical path',b:'bullish',date:'2026-04-20'},{t:'Onshoring: US manufacturing expansion = new industrial power demand = GEV turbines',b:'bullish',date:'2026-04-25'}] }
  },  AVGO: {
    name: 'Broadcom',
    upstream: [
      { ticker:'TSM',  metric:'capex',            lag:1, direction:'positive', weight:0.45,
        desc:'TSMC 3nm/2nm wafer starts → AVGO custom ASIC production capacity',
        logic:'AVGO custom ASICs (Google TPU, Meta MTIA) are manufactured exclusively at TSMC advanced nodes. TSMC capex beat signals wafer allocation expansion for AVGO 1 quarter out.' },
      { ticker:'GOOGL', metric:'capex',            lag:1, direction:'positive', weight:0.35,
        desc:'Google capex → AVGO TPU v5/v6 ASIC order intake',
        logic:'Google is AVGO largest custom ASIC customer (~40% of XPU revenue). Google capex acceleration signals new TPU tape-out and production ramp 1-2 quarters ahead.' },
      { ticker:'META',  metric:'capex',            lag:1, direction:'positive', weight:0.20,
        desc:'Meta capex → AVGO MTIA inference chip orders',
        logic:'Meta MTIA (custom AI inference chip) is designed and supplied by AVGO. Meta capex beat implies MTIA production ramp — each chip is sole-source AVGO revenue.' }
    ]
  },
  MRVL: {
    name: 'Marvell Technology',
    upstream: [
      { ticker:'TSM',  metric:'capex',            lag:1, direction:'positive', weight:0.40,
        desc:'TSMC 3nm CoWoS packaging → MRVL custom ASIC production schedule',
        logic:'MRVL custom chips for AWS Trainium and Azure Maia are TSMC 3nm. TSMC CoWoS packaging capacity is the bottleneck — capex beat signals available slots for MRVL ramp.' },
      { ticker:'AMZN', metric:'capex',            lag:1, direction:'positive', weight:0.35,
        desc:'AWS capex → MRVL Trainium 3 custom chip production ramp',
        logic:'MRVL is sole-source designer for AWS Trainium 3. AWS capex acceleration confirms AI training infrastructure expansion — direct MRVL volume signal.' },
      { ticker:'MSFT',  metric:'capex',            lag:1, direction:'positive', weight:0.25,
        desc:'Azure capex → MRVL Maia 2 custom ASIC orders',
        logic:'MRVL designs Azure Maia 2 custom AI chip. MSFT capex beat implies Maia 2 ramp is on or ahead of schedule — direct MRVL revenue.' }
    ]
  },
  INTC: {
    name: 'Intel Corporation',
    upstream: [
      { ticker:'ASML', metric:'revenue',           lag:2, direction:'positive', weight:0.50,
        desc:'ASML High-NA EUV delivery → Intel 18A process capability unlock',
        logic:'Intel 18A production requires ASML High-NA EUV (first US delivery). ASML revenue beat including High-NA shipments signals Intel foundry production capability 2 quarters out.' },
      { ticker:'NVDA', metric:'revenue_datacenter', lag:1, direction:'negative', weight:0.30,
        desc:'NVIDIA datacenter revenue growth → INTC Gaudi market share pressure',
        logic:'NVDA datacenter dominance reduces urgency for customers to evaluate Gaudi. NVDA beat implies INTC AI accelerator wins are harder to close — negative signal for near-term Gaudi revenue.' },
      { ticker:'TSM',  metric:'revenue',           lag:1, direction:'negative', weight:0.20,
        desc:'TSMC advanced node demand → validates Intel Foundry competitive positioning',
        logic:'TSMC revenue beat signals strong external foundry demand, validating that advanced node customers exist. This is indirect positive for Intel Foundry Services long-term, but short-term signals TSMC winning deals Intel wants.' }
    ]
  },
  DELL: {
    name: 'Dell Technologies',
    upstream: [
      { ticker:'NVDA', metric:'revenue_datacenter', lag:0, direction:'positive', weight:0.60,
        desc:'NVIDIA Blackwell GPU shipments → DELL AI server assembly and revenue',
        logic:'DELL is one of the top 3 NVIDIA ODM partners. NVDA datacenter revenue beat directly implies DELL AI server builds are ramping — NVDA GPUs are the core component in DELL PowerEdge AI servers.' },
      { ticker:'AMD',  metric:'revenue_datacenter', lag:0, direction:'positive', weight:0.25,
        desc:'AMD Instinct GPU revenue → DELL AI server mix diversification',
        logic:'DELL builds AMD Instinct-based AI servers for price-sensitive enterprise customers. AMD datacenter revenue beat signals DELL is shipping AMD-based AI server SKUs.' },
      { ticker:'MU',   metric:'revenue',           lag:0, direction:'positive', weight:0.15,
        desc:'Micron HBM and DDR5 revenue → DELL server memory availability',
        logic:'AI servers require massive DRAM (DDR5) and HBM. MU revenue and shipment data signals memory supply availability — tight supply delays DELL server builds.' }
    ]
  },
  ORCL: {
    name: 'Oracle Corporation',
    upstream: [
      { ticker:'NVDA', metric:'revenue_datacenter', lag:1, direction:'positive', weight:0.55,
        desc:'NVIDIA GPU availability → ORCL OCI cluster capacity expansion',
        logic:'ORCL OCI GPU clusters are the primary AI training product. NVDA datacenter shipments are the supply constraint. NVDA revenue beat signals ORCL can provision contracted GPU clusters on schedule.' },
      { ticker:'AMZN', metric:'revenue_aws',        lag:1, direction:'positive', weight:0.25,
        desc:'AWS revenue growth → validates enterprise cloud spending, benefits ORCL OCI',
        logic:'AWS growth confirms enterprise cloud budgets are healthy. ORCL OCI is the overflow and alternative — customers who cannot get AWS GPU allocation come to ORCL.' },
      { ticker:'MSFT',  metric:'revenue_cloud',     lag:1, direction:'positive', weight:0.20,
        desc:'Azure growth → enterprise cloud commitment validation for ORCL database migration',
        logic:'Azure growth signals enterprises are committing to cloud, including Oracle Database on Azure. MSFT and ORCL have a joint product (Oracle Database@Azure) — MSFT Azure growth is a co-selling signal.' }
    ]
  },
  NET: {
    name: 'Cloudflare',
    upstream: [
      { ticker:'NVDA', metric:'revenue_datacenter', lag:2, direction:'positive', weight:0.40,
        desc:'NVIDIA GPU cluster buildout → AI inference traffic routes through Cloudflare edge',
        logic:'As AI training clusters come online, inference traffic (real-time AI API calls) routes through the internet — and Cloudflare handles 20% of all web traffic. NVDA buildout is a 2Q leading indicator for NET AI Gateway volume.' },
      { ticker:'MSFT',  metric:'revenue_cloud',     lag:1, direction:'positive', weight:0.35,
        desc:'Azure OpenAI Service growth → Cloudflare AI Gateway traffic',
        logic:'Azure OpenAI is the largest source of enterprise LLM API calls. Many companies route these calls through Cloudflare AI Gateway for caching and observability. MSFT cloud growth is a direct NET traffic signal.' },
      { ticker:'GOOGL', metric:'revenue_cloud',     lag:1, direction:'positive', weight:0.25,
        desc:'Google Cloud AI API growth → Cloudflare edge inference routing',
        logic:'Google Cloud Vertex AI API traffic is increasingly routed through Cloudflare Workers for low-latency edge delivery. GOOGL cloud beat confirms enterprise AI API adoption is accelerating.' }
    ]
  },
  NEE: {
    name: 'NextEra Energy',
    upstream: [
      { ticker:'GEV',  metric:'revenue',            lag:2, direction:'positive', weight:0.35,
        desc:'GE Vernova turbine orders → NEE gas peaker and combined-cycle capacity expansion',
        logic:'NEE uses GEV gas turbines for baseload and peaker plants. GEV order intake beat signals utility power capacity expansion is accelerating — NEE is one of the top GEV customers.' },
      { ticker:'NVDA', metric:'revenue_datacenter', lag:3, direction:'positive', weight:0.35,
        desc:'NVIDIA GPU cluster buildout → hyperscaler power demand → NEE long-term PPAs',
        logic:'AI data center buildout drives hyperscaler power demand. Hyperscalers sign 20-year PPAs with NEE to secure power. NVDA datacenter revenue is a 3Q leading indicator for NEE PPA signings.' },
      { ticker:'AMZN', metric:'capex',              lag:2, direction:'positive', weight:0.30,
        desc:'AWS capex → data center power demand → NEE power purchase agreements',
        logic:'AWS data center capex is the most direct indicator of future power demand. NEE PPAs follow data center construction commitments by 2-3 quarters.' }
    ]
  },
  ETN: {
    name: 'Eaton Corporation',
    upstream: [
      { ticker:'GEV',  metric:'revenue',            lag:1, direction:'positive', weight:0.40,
        desc:'GE Vernova turbine shipments → ETN switchgear and PDU demand at power plants',
        logic:'Every GEV turbine installation requires Eaton switchgear to distribute the generated power. GEV revenue beat implies ETN electrical equipment orders 1 quarter later.' },
      { ticker:'NVDA', metric:'revenue_datacenter', lag:2, direction:'positive', weight:0.35,
        desc:'NVIDIA GPU cluster buildout → data center power distribution equipment demand',
        logic:'AI data centers require 10-100x more power per sq ft than traditional DCs. Each NVIDIA GPU cluster campus needs ETN PDUs and switchgear. NVDA datacenter revenue is a 2Q leading indicator for ETN data center orders.' },
      { ticker:'NEE',  metric:'capex',              lag:1, direction:'positive', weight:0.25,
        desc:'NextEra capex → grid expansion requiring ETN transformers and distribution equipment',
        logic:'NEE grid expansion and new power plant construction requires ETN electrical equipment at every step. NEE capex beat signals ETN equipment order intake 1 quarter ahead.' }
    ]
  },
  PWR: {
    name: 'Quanta Services',
    upstream: [
      { ticker:'NEE',  metric:'capex',              lag:1, direction:'positive', weight:0.40,
        desc:'NextEra capex → transmission line and substation construction contracts for Quanta',
        logic:'NEE is one of PWR largest customers. NEE capex beat implies new transmission and substation projects that PWR will build. 1 quarter lag from capex commitment to construction contract award.' },
      { ticker:'GEV',  metric:'revenue',            lag:2, direction:'positive', weight:0.30,
        desc:'GE Vernova turbine orders → grid interconnection construction for Quanta',
        logic:'Every new GEV power plant needs grid interconnection built by contractors like PWR. GEV order intake beat signals future PWR interconnection work 2 quarters out.' },
      { ticker:'NVDA', metric:'revenue_datacenter', lag:3, direction:'positive', weight:0.30,
        desc:'NVIDIA datacenter revenue → hyperscaler grid connection contracts for Quanta',
        logic:'Hyperscaler data center campus construction requires dedicated transmission lines PWR builds. NVDA datacenter growth signals future hyperscaler capex → utility PPAs → grid construction PWR executes.' }
    ]
  },
  OKLO: {
    name: 'Oklo Inc.',
    upstream: [
      { ticker:'NVDA', metric:'revenue_datacenter', lag:4, direction:'positive', weight:0.50,
        desc:'NVIDIA GPU cluster buildout → AI power demand → nuclear SMR procurement pipeline',
        logic:'AI data centers need 24/7 carbon-free power. Nuclear SMR is the only solution that meets all three requirements. NVDA datacenter revenue growth is the 4-quarter leading indicator for hyperscaler nuclear procurement decisions.' },
      { ticker:'CEG',  metric:'revenue',            lag:2, direction:'positive', weight:0.30,
        desc:'Constellation Energy nuclear power deals → validates nuclear-for-AI thesis benefiting OKLO',
        logic:'CEG nuclear-for-AI deals (Microsoft, Google) validate the entire nuclear SMR thesis. Each CEG deal announcement reduces risk perception for OKLO and accelerates customer conversations.' },
      { ticker:'AMZN', metric:'capex',              lag:3, direction:'positive', weight:0.20,
        desc:'AWS capex → data center power demand → nuclear SMR procurement pipeline',
        logic:'Amazon has signed nuclear agreements with Dominion and X-energy. AWS capex acceleration signals Amazon will pursue additional nuclear supply, creating pipeline for OKLO.' }
    ]
  },
  GD: {
    name: 'General Dynamics',
    upstream: [
      { ticker:'LMT',  metric:'revenue',            lag:1, direction:'positive', weight:0.45,
        desc:'Lockheed Martin revenue beat → confirms defense budget execution, benefits GD',
        logic:'LMT and GD serve overlapping DoD budget categories. LMT revenue beat signals DoD spending is being executed as planned — GD combat systems and submarines operate on the same budget cycle.' },
      { ticker:'NOC',  metric:'revenue',            lag:1, direction:'positive', weight:0.30,
        desc:'Northrop revenue beat → defense electronics demand confirms GD Mission Systems outlook',
        logic:'NOC and GD Mission Systems compete for C4ISR and AI battlefield contracts. NOC revenue beat signals the defense electronics budget is healthy — positive read-through for GD.' },
      { ticker:'RTX',  metric:'revenue',            lag:1, direction:'positive', weight:0.25,
        desc:'RTX defense revenue → sector-wide defense procurement confirmation',
        logic:'RTX, LMT, NOC, and GD all read the same DoD appropriations. RTX beat confirms the overall defense sector revenue environment is favorable for GD.' }
    ]
  },
  LHX: {
    name: 'L3Harris Technologies',
    upstream: [
      { ticker:'NOC',  metric:'revenue',            lag:1, direction:'positive', weight:0.45,
        desc:'Northrop revenue → space and ISR budget confirmation for L3Harris',
        logic:'NOC and LHX both compete for space-based ISR contracts. NOC beat signals the intelligence community and DoD space budget is being spent — positive for LHX satellite and sensor programs.' },
      { ticker:'LMT',  metric:'revenue',            lag:1, direction:'positive', weight:0.30,
        desc:'Lockheed revenue → fighter and missile programs drive LHX avionics demand',
        logic:'LHX supplies avionics, electronic warfare systems, and communications to LMT F-35 and F-16 programs. LMT revenue beat signals LHX subsystem deliveries are on schedule.' },
      { ticker:'RTX',  metric:'revenue',            lag:1, direction:'positive', weight:0.25,
        desc:'RTX defense revenue → defense electronics environment confirmation',
        logic:'RTX defense systems use LHX electronic warfare and communications components. RTX beat confirms component demand is healthy across the defense electronics supply chain.' }
    ]
  },
  ADBE: {
    name: 'Adobe Inc.',
    upstream: [
      { ticker:'NVDA', metric:'revenue_datacenter', lag:2, direction:'positive', weight:0.45,
        desc:'NVIDIA GPU availability → Adobe Firefly AI generation speed and scale',
        logic:'Adobe Firefly runs on NVIDIA H100/H200 GPU clusters on AWS. NVDA datacenter revenue beat signals GPU availability improving — directly reduces Adobe AI generation latency and capacity constraints.' },
      { ticker:'MSFT',  metric:'revenue_cloud',     lag:1, direction:'positive', weight:0.30,
        desc:'Microsoft cloud growth → Adobe Creative Cloud + Microsoft 365 co-selling pipeline',
        logic:'Adobe and Microsoft have a joint integration (Adobe Express in Teams, Firefly in Copilot). MSFT cloud growth signals enterprise software budgets are healthy — Adobe rides the same enterprise renewal cycle.' },
      { ticker:'CRM',  metric:'revenue',            lag:1, direction:'positive', weight:0.25,
        desc:'Salesforce revenue → enterprise software spending environment confirmation',
        logic:'Adobe and Salesforce share enterprise marketing and CRM customers. Salesforce beat signals enterprise software budgets are intact — positive read-through for Adobe Creative Cloud renewals.' }
    ]
  },
  TSLA: {
    name: 'Tesla Inc.',
    upstream: [
      { ticker:'NVDA', metric:'revenue_datacenter', lag:1, direction:'positive', weight:0.35,
        desc:'NVIDIA Dojo competitor reveals → Tesla custom AI chip competitive positioning',
        logic:'Tesla Dojo supercomputer competes with NVIDIA for AI training. NVDA datacenter dominance is a headwind for Dojo adoption outside Tesla. NVDA beat signals Tesla must continue building Dojo to remain competitive in autonomous driving AI.' },
      { ticker:'ON',   metric:'revenue',            lag:1, direction:'positive', weight:0.35,
        desc:'ON Semiconductor SiC revenue → Tesla EV powertrain component availability',
        logic:'Tesla is ON Semiconductor largest SiC customer (~20% of ON SiC revenue). ON SiC production ramp signals Tesla can source sufficient power modules for Model Y and Cybertruck production scaling.' },
      { ticker:'PANW', metric:'revenue',            lag:2, direction:'positive', weight:0.30,
        desc:'Panasonic battery cell production → Tesla vehicle production rate',
        logic:'Panasonic produces 4680 cells at Giga Nevada. Panasonic quarterly production disclosures are a leading indicator for Tesla battery availability and vehicle production guidance.' }
    ]
  },
  NFLX: {
    name: 'Netflix Inc.',
    upstream: [
      { ticker:'NVDA', metric:'revenue_datacenter', lag:2, direction:'positive', weight:0.40,
        desc:'NVIDIA GPU availability → Netflix AI recommendation model retraining speed',
        logic:'Netflix retrains its recommendation engine on NVIDIA GPU clusters weekly. NVDA datacenter revenue beat signals GPU cloud capacity is available — Netflix can run larger models and more frequent retraining.' },
      { ticker:'GOOGL', metric:'revenue_ads',       lag:1, direction:'positive', weight:0.35,
        desc:'Google ad revenue → digital advertising market health, benefits Netflix ad tier',
        logic:'Google ad revenue is the benchmark for digital advertising CPMs. Google beat signals advertisers are spending more, validating Netflix ad tier CPM pricing of $45-55 per thousand impressions.' },
      { ticker:'META',  metric:'revenue',           lag:1, direction:'positive', weight:0.25,
        desc:'Meta advertising revenue → streaming ad market validation for Netflix',
        logic:'Meta and Netflix compete for the same brand advertising budgets. Meta beat signals total brand ad spending is healthy — positive read-through for Netflix ad tier revenue growth.' }
    ]
  },
  APP: {
    name: 'AppLovin Corporation',
    upstream: [
      { ticker:'NVDA', metric:'revenue_datacenter', lag:1, direction:'positive', weight:0.40,
        desc:'NVIDIA GPU availability → AXON AI model training and inference capacity',
        logic:'APP AXON engine runs on NVIDIA GPU infrastructure. NVDA datacenter revenue beat signals APP can access more GPU capacity for AXON model training and real-time inference at scale.' },
      { ticker:'META',  metric:'revenue',           lag:1, direction:'negative', weight:0.35,
        desc:'Meta advertising revenue → competitive intensity in mobile performance marketing',
        logic:'Meta and APP compete for mobile performance advertising budgets. Meta beat can signal advertisers are concentrating spend on Meta (negative for APP) OR that total mobile ad budgets are expanding (positive for both).' },
      { ticker:'GOOGL', metric:'revenue_ads',       lag:1, direction:'positive', weight:0.25,
        desc:'Google ad revenue beat → mobile advertising market expansion',
        logic:'Google ad revenue growth signals overall digital advertising market is expanding. Larger total ad spend means more budget available for mobile performance channels where APP AXON operates.' }
    ]
  },
  ON: {
    name: 'ON Semiconductor',
    upstream: [
      { ticker:'TSM',  metric:'revenue',            lag:1, direction:'positive', weight:0.40,
        desc:'TSMC advanced process revenue → ON logic chip availability for SiC control circuits',
        logic:'ON uses TSMC advanced nodes for the logic chips that control SiC power modules. TSMC revenue beat signals capacity availability — ON can produce more complete SiC systems.' },
      { ticker:'TSLA', metric:'revenue',            lag:0, direction:'positive', weight:0.35,
        desc:'Tesla vehicle production volume → ON SiC power module demand',
        logic:'Tesla is ON largest SiC customer. Tesla quarterly vehicle delivery numbers are a same-quarter indicator for ON SiC revenue. Each Tesla Model Y uses $400+ of ON SiC content.' },
      { ticker:'NVDA', metric:'revenue_datacenter', lag:2, direction:'positive', weight:0.25,
        desc:'NVIDIA AI data center buildout → power conversion semiconductor demand for ON',
        logic:'AI server power supplies use SiC power modules for efficiency. NVDA datacenter revenue growth drives data center construction which drives ON SiC power supply content.' }
    ]
  },
  HPE: {
    name: 'Hewlett Packard Enterprise',
    upstream: [
      { ticker:'NVDA', metric:'revenue_datacenter', lag:1, direction:'positive', weight:0.50,
        desc:'NVIDIA GPU shipments → HPE AI server (ProLiant Gen12) builds and revenue',
        logic:'HPE integrates NVIDIA GPUs into ProLiant AI servers. NVDA datacenter revenue beat signals GPU supply is improving — HPE can fulfill the AI server order backlog faster.' },
      { ticker:'AMD',  metric:'revenue_datacenter', lag:1, direction:'positive', weight:0.25,
        desc:'AMD Instinct GPU revenue → HPE AI server AMD-based SKU demand',
        logic:'HPE offers AMD Instinct-based AI server configurations for cost-sensitive enterprise deployments. AMD datacenter beat signals HPE is shipping AMD AI server SKUs.' },
      { ticker:'MU',   metric:'revenue',            lag:1, direction:'positive', weight:0.25,
        desc:'Micron DDR5 availability → HPE server memory supply chain',
        logic:'AI servers require large DDR5 DRAM pools. MU revenue beat and guidance signals memory supply is adequate — HPE can complete AI server builds without memory allocation delays.' }
    ]
  },
  WDAY: {
    name: 'Workday Inc.',
    upstream: [
      { ticker:'MSFT',  metric:'revenue_cloud',     lag:1, direction:'positive', weight:0.45,
        desc:'Microsoft cloud revenue → enterprise software spending validation for Workday',
        logic:'MSFT and WDAY serve the same enterprise IT buyers. MSFT cloud beat signals enterprise digital transformation budgets are intact — Workday HR and finance cloud deals operate on the same procurement cycle.' },
      { ticker:'CRM',  metric:'revenue',            lag:1, direction:'positive', weight:0.35,
        desc:'Salesforce revenue → enterprise SaaS spending environment for Workday',
        logic:'CRM and WDAY are the two most important enterprise SaaS platforms. CRM beat confirms enterprise willingness to spend on cloud software — strongly positive for WDAY renewal and expansion rates.' },
      { ticker:'NOW',  metric:'revenue',            lag:1, direction:'positive', weight:0.20,
        desc:'ServiceNow revenue → enterprise AI SaaS upsell validation',
        logic:'NOW and WDAY both sell AI-enhanced enterprise SaaS. NOW beat signals enterprise customers are adopting AI SaaS upsells — validates WDAY AI Assist adoption trajectory.' }
    ]
  },
  COIN: {
    name: 'Coinbase Global',
    upstream: [
      { ticker:'NVDA', metric:'revenue_datacenter', lag:2, direction:'positive', weight:0.30,
        desc:'NVIDIA datacenter revenue → crypto mining hardware demand → network activity',
        logic:'GPU availability affects crypto mining profitability. NVDA datacenter revenue growth indirectly signals GPU supply — when GPUs are scarce for miners, on-chain activity shifts, affecting COIN transaction volumes.' },
      { ticker:'MSFT',  metric:'revenue_cloud',     lag:1, direction:'positive', weight:0.35,
        desc:'Microsoft cloud + enterprise tech spending → institutional crypto adoption budget',
        logic:'MSFT cloud growth signals institutional technology budgets are healthy. Institutional crypto trading (Coinbase Advanced) follows enterprise IT spending — institutions allocate to crypto when overall tech investment is healthy.' },
      { ticker:'GOOGL', metric:'revenue_ads',       lag:1, direction:'positive', weight:0.35,
        desc:'Google ad revenue → retail investor sentiment and trading activity',
        logic:'Google ad revenue reflects consumer spending and sentiment. Retail investor crypto trading activity on Coinbase correlates with consumer confidence — GOOGL ad beat is an indirect retail activity signal.' }
    ]
  },

  // ── Semi equipment cluster ──────────────────────────────────────────────
  KLAC: {
    name: 'KLA Corporation',
    upstream: [
      { ticker:'TSM',  metric:'capex',              lag:2, direction:'positive', weight:0.90,
        desc:'TSMC capex expansion drives KLA process control and inspection tool demand',
        logic:'Every new TSMC fab line requires KLA inspection at each process step. Capex guidance → tool orders 2Q out.' },
      { ticker:'INTC', metric:'capex',              lag:2, direction:'positive', weight:0.60,
        desc:'Intel fab ramp requires KLA inspection for node yield improvement',
        logic:'INTC advanced node transitions need intensive process control. KLA tools are standard at every Intel fab.' },
      { ticker:'NVDA', metric:'revenue_datacenter',  lag:3, direction:'positive', weight:0.75,
        desc:'NVDA datacenter demand drives TSMC capacity expansion and KLA inspection tool orders',
        logic:'NVDA AI chip demand forces TSM N2/N3 ramp. Every new TSMC chamber requires KLA process control.' }
    ]
  },
  ENTG: {
    name: 'Entegris',
    upstream: [
      { ticker:'TSM',  metric:'capex',              lag:1, direction:'positive', weight:0.85,
        desc:'TSMC fab utilization drives Entegris process material and filter consumption',
        logic:'ENTG consumables are consumed at a rate proportional to TSMC wafer starts. N2 node = 40% more materials per wafer.' },
      { ticker:'AMAT', metric:'revenue',             lag:1, direction:'positive', weight:0.65,
        desc:'Applied Materials tool shipments drive Entegris materials demand as ongoing consumables',
        logic:'Each AMAT tool deployed in a fab requires ENTG gas filters, fluid carriers, and process chemicals as consumables.' },
      { ticker:'NVDA', metric:'revenue_datacenter',  lag:2, direction:'positive', weight:0.70,
        desc:'NVDA AI demand drives TSM N2 ramp, expanding ENTG materials consumption at 40% higher intensity per wafer',
        logic:'N2/N3 nodes require 40% more Entegris materials per wafer vs N5/N7. NVDA demand forces TSM N2 ramp.' }
    ]
  },
  TER: {
    name: 'Teradyne',
    upstream: [
      { ticker:'NVDA', metric:'revenue_datacenter',  lag:1, direction:'positive', weight:0.85,
        desc:'NVDA Blackwell GPU complexity drives 4x test time vs H100 -- direct ATE demand multiplier',
        logic:'Each NVDA Blackwell GPU requires 4x the test time of H100 on Teradyne ATE. Higher volume + higher intensity = compounding ATE demand.' },
      { ticker:'AMD',  metric:'revenue_datacenter',  lag:1, direction:'positive', weight:0.65,
        desc:'AMD datacenter GPU share gains drive additional chip test demand at Teradyne',
        logic:'AMD MI300X/MI400 chips use TSMC advanced nodes and require Teradyne ATE for production testing.' },
      { ticker:'MU',   metric:'revenue',             lag:1, direction:'positive', weight:0.70,
        desc:'Micron HBM production ramp drives memory test demand -- Teradyne dominates memory ATE',
        logic:'HBM3E stack testing requires Teradyne Magnum ULTRA ATE. MU HBM ramp directly expands TER memory test backlog.' }
    ]
  },
  MKSI: {
    name: 'MKS Instruments',
    upstream: [
      { ticker:'AMAT', metric:'revenue',  lag:1, direction:'positive', weight:0.85,
        desc:'Applied Materials etch/deposition tool orders drive MKS RF power and gas delivery subsystem demand',
        logic:'MKSI makes the RF power and gas delivery systems inside AMAT tools. Every AMAT tool order includes MKSI subsystems.' },
      { ticker:'LRCX', metric:'revenue',  lag:1, direction:'positive', weight:0.80,
        desc:'Lam Research etch tool shipments include MKS power delivery systems as standard components',
        logic:'LRCX etch tools incorporate MKSI RF power delivery. LRCX revenue growth directly tracks to MKSI subsystem demand.' },
      { ticker:'TSM',  metric:'capex',   lag:2, direction:'positive', weight:0.70,
        desc:'TSMC fab expansion drives MKSI subsystem demand through AMAT/LRCX tool orders',
        logic:'TSMC capex → AMAT/LRCX tool orders → MKSI subsystems. 2Q lag from TSMC capex to MKSI revenue.' }
    ]
  },
  ONTO: {
    name: 'Onto Innovation',
    upstream: [
      { ticker:'NVDA', metric:'revenue_datacenter',  lag:1, direction:'positive', weight:0.90,
        desc:'NVDA Blackwell CoWoS-L adoption drives ONTO advanced packaging inspection as sole-qualified tool',
        logic:'Every NVDA Blackwell uses CoWoS-L at TSMC. ONTO is sole qualified for CoWoS-L inspection. NVDA volume = ONTO volume.' },
      { ticker:'TSM',  metric:'capex',              lag:2, direction:'positive', weight:0.80,
        desc:'TSMC advanced packaging capex drives ONTO CoWoS inspection tool orders',
        logic:'TSMC CoWoS capacity expansion requires new ONTO inspection systems. TSMC capex → ONTO tool orders in ~2Q.' },
      { ticker:'MU',   metric:'revenue',             lag:1, direction:'positive', weight:0.75,
        desc:'Micron HBM3E production ramp drives ONTO HBM inspection volume -- critical for yield at 12-hi stacks',
        logic:'HBM3E 12-high memory stacks require ONTO optical inspection at every bonding layer. MU HBM ramp = direct ONTO volume.' }
    ]
  },

  V: { name:'Visa', upstream:[
    { ticker:'AAPL', metric:'revenue', lag:1, direction:'positive', weight:0.70, desc:'Apple Pay contactless volume drives Visa network transactions', logic:'Apple Pay uses Visa rails for ~60% of contactless transactions. AAPL revenue correlates to contactless adoption.' },
    { ticker:'AMZN', metric:'revenue', lag:1, direction:'positive', weight:0.65, desc:'Amazon e-commerce volume drives Visa card-not-present transactions', logic:'AMZN commerce growth increases Visa CNP transaction volume.' }
  ]},
  MA: { name:'Mastercard', upstream:[
    { ticker:'AAPL', metric:'revenue', lag:1, direction:'positive', weight:0.65, desc:'Apple Pay contactless volume flows partly through Mastercard rails', logic:'Mastercard captures ~40% of Apple Pay contactless volume. AAPL device penetration drives MA revenue.' },
    { ticker:'GOOGL', metric:'revenue', lag:1, direction:'positive', weight:0.60, desc:'Google Pay and Android contactless adoption drives Mastercard transaction volume', logic:'Google Pay primarily routes through Mastercard. Android smartphone growth drives MA volumes internationally.' }
  ]},
  PYPL: { name:'PayPal', upstream:[
    { ticker:'AMZN', metric:'revenue', lag:1, direction:'positive', weight:0.60, desc:'E-commerce volume growth drives PayPal checkout transaction volume', logic:'PayPal processes checkout on 2M+ e-commerce sites. AMZN GMV growth drives PayPal TPV.' },
    { ticker:'COIN', metric:'revenue', lag:2, direction:'positive', weight:0.55, desc:'Crypto market activity drives PayPal crypto revenue and Venmo crypto feature usage', logic:'PayPal crypto revenue moves with broader crypto market. COIN revenue leads retail crypto engagement by ~1Q.' }
  ]},
  SQ: { name:'Block', upstream:[
    { ticker:'COIN', metric:'revenue', lag:1, direction:'positive', weight:0.70, desc:'Bitcoin price and crypto volumes drive Block Cash App Bitcoin trading revenue', logic:'Cash App Bitcoin revenue is the largest Block segment. COIN revenue correlates to retail crypto activity with ~1Q lag.' },
    { ticker:'AAPL', metric:'revenue', lag:2, direction:'positive', weight:0.60, desc:'iPhone penetration in SMB market drives Square card reader and POS adoption', logic:'Square POS runs on iOS. iPhone SMB market penetration leads Square merchant adoption curve.' }
  ]},
  HOOD: { name:'Robinhood Markets', upstream:[
    { ticker:'COIN', metric:'revenue', lag:1, direction:'positive', weight:0.75, desc:'Crypto market activity drives Robinhood crypto trading revenue', logic:'HOOD crypto revenue tracks COIN revenue with ~1Q lag. Retail crypto sentiment drives HOOD options and crypto volume.' },
    { ticker:'NVDA', metric:'price', lag:1, direction:'positive', weight:0.55, desc:'AI and tech market momentum drives retail options volume on semiconductor names', logic:'NVDA stock volatility directly increases Robinhood options revenue. AI hype cycles correlate to HOOD transaction activity.' }
  ]},
  DDOG: { name:'Datadog', upstream:[
    { ticker:'MSFT', metric:'revenue', lag:1, direction:'positive', weight:0.75, desc:'Azure cloud growth drives Datadog monitoring seats', logic:'Datadog revenue correlates to hyperscaler cloud growth. MSFT Azure revenue leads Datadog customer expansion by ~1Q.' },
    { ticker:'NVDA', metric:'revenue', lag:1, direction:'positive', weight:0.65, desc:'AI workload proliferation drives AI observability demand', logic:'Every AI model deployment requires monitoring. NVDA datacenter revenue growth signals AI workload expansion that DDOG monitors.' }
  ]},
  MDB: { name:'MongoDB', upstream:[
    { ticker:'AMZN', metric:'revenue', lag:1, direction:'positive', weight:0.70, desc:'AWS growth drives MongoDB Atlas adoption', logic:'MongoDB Atlas runs on AWS, Azure, GCP. AMZN AWS revenue growth signals developer platform expansion benefiting Atlas.' },
    { ticker:'NVDA', metric:'revenue', lag:1, direction:'positive', weight:0.60, desc:'AI application development surge drives MongoDB vector search and Atlas demand', logic:'AI applications need a database layer. NVDA AI infrastructure growth leads MongoDB developer adoption by 1-2 quarters.' }
  ]},
  ZS: { name:'Zscaler', upstream:[
    { ticker:'MSFT', metric:'revenue', lag:2, direction:'positive', weight:0.70, desc:'Microsoft enterprise cloud adoption drives zero-trust security mandate', logic:'As enterprises move to M365 and Azure, they adopt zero-trust networking. MSFT enterprise revenue signals ZS pipeline 2Q ahead.' },
    { ticker:'GOOGL', metric:'revenue', lag:1, direction:'positive', weight:0.55, desc:'Google Workspace and GCP adoption drives Zscaler deployment at enterprise accounts', logic:'Zscaler secures traffic to Google Workspace. GOOGL enterprise cloud growth leads Zscaler seat expansion.' }
  ]},
  ESTC: { name:'Elastic NV', upstream:[
    { ticker:'AMZN', metric:'revenue', lag:1, direction:'positive', weight:0.65, desc:'AWS marketplace Elastic growth tracks AWS adoption', logic:'Elastic generates 30%+ revenue through AWS marketplace. AMZN AWS growth directly expands Elastic customer reach.' },
    { ticker:'MSFT', metric:'revenue', lag:1, direction:'positive', weight:0.60, desc:'Azure cloud adoption drives Elastic Security SIEM deployments for unified log analysis', logic:'Elastic Security runs on Azure for enterprise SIEM. MSFT enterprise cloud revenue signals Elastic SIEM expansion.' }
  ]},


  // ── ANET: driven by hyperscaler AI networking capex ──────────
  ANET: { name:'Arista Networks', upstream:[
    { ticker:'META', metric:'capex', lag:1, direction:'positive', weight:0.35, desc:'Meta AI spine capex → Arista 400G/800G orders', logic:'Meta sole-sourced Arista for 100K+ port AI spine network. Meta capex guidance beats signal ANET order expansion 1 quarter ahead.' },
    { ticker:'MSFT', metric:'capex', lag:1, direction:'positive', weight:0.30, desc:'MSFT AI cluster capex → Arista 800G Ethernet wins', logic:'Microsoft AI clusters displaced InfiniBand in favor of Arista Ethernet. MSFT capex beats translate to ANET backlog expansion.' },
    { ticker:'GOOGL', metric:'capex', lag:1, direction:'positive', weight:0.20, desc:'Google datacenter capex → Arista networking orders', logic:'Google standardized on Arista for AI fabric. GOOGL capex beats signal ANET networking demand 1 quarter out.' },
    { ticker:'AMZN', metric:'capex', lag:1, direction:'positive', weight:0.15, desc:'AWS AI networking capex → Arista demand', logic:'AWS AI infrastructure expansion includes Arista networking. AMZN capex beats provide incremental ANET order visibility.' }
  ]},

  // ── PSTG: driven by NVDA AI platform pull-through ────────────
  PSTG: { name:'Pure Storage', upstream:[
    { ticker:'NVDA', metric:'revenue', lag:1, direction:'positive', weight:0.55, desc:'NVDA DGX system revenue → Pure Storage FlashBlade pull-through', logic:'NVDA DGX system ($1.2M) includes Pure Storage FlashBlade as sole-source reference architecture. Every NVDA DGX sold drives a Pure Storage order.' },
    { ticker:'MSFT', metric:'capex', lag:1, direction:'positive', weight:0.25, desc:'MSFT AI capex → Pure Storage enterprise AI deployments', logic:'Microsoft Azure enterprise AI deployments use Pure Storage. MSFT capex beats signal PSTG enterprise pipeline expansion.' },
    { ticker:'AMZN', metric:'capex', lag:1, direction:'positive', weight:0.20, desc:'AWS AI capex → Pure Storage cloud deployments', logic:'AWS Outposts FlashBlade certification expands PSTG addressable market. AMZN AI capex beats signal PSTG deployment acceleration.' }
  ]},

  // ── NTAP: driven by cloud adoption + hybrid AI workloads ─────
  NTAP: { name:'NetApp', upstream:[
    { ticker:'AMZN', metric:'revenue', lag:1, direction:'positive', weight:0.45, desc:'AWS revenue → FSx for ONTAP demand', logic:'AWS FSx for ONTAP is growing 40%+ YoY — tracks AWS enterprise adoption. AMZN AWS revenue beats signal NTAP cloud storage pull-through.' },
    { ticker:'MSFT', metric:'revenue', lag:1, direction:'positive', weight:0.35, desc:'Azure revenue → Azure NetApp Files enterprise adoption', logic:'Azure NetApp Files has 2,400+ enterprise customers. MSFT enterprise cloud revenue beats signal NTAP hybrid cloud expansion.' },
    { ticker:'GOOGL', metric:'revenue', lag:1, direction:'positive', weight:0.20, desc:'GCP revenue → Google Cloud NetApp Volumes adoption', logic:'Google Cloud NetApp Volumes launched 2023. GOOGL cloud revenue signals NTAP GCP channel growth.' }
  ]},

  // ── WDC: driven by hyperscaler AI storage HDD demand ────────
  WDC: { name:'Western Digital', upstream:[
    { ticker:'META', metric:'capex', lag:1, direction:'positive', weight:0.30, desc:'Meta AI datacenter capex → WDC Ultrastar HDD demand', logic:'Meta AI training clusters require 100PB+ cold storage. Meta capex beats signal WDC HDD order acceleration 1 quarter ahead.' },
    { ticker:'MSFT', metric:'capex', lag:1, direction:'positive', weight:0.30, desc:'MSFT Azure AI storage capex → WDC HDD demand', logic:'Azure AI data lakes use WDC Ultrastar HDDs for cost-effective cold storage at scale. MSFT capex beats = WDC hyperscaler orders.' },
    { ticker:'GOOGL', metric:'capex', lag:1, direction:'positive', weight:0.25, desc:'Google AI infrastructure capex → WDC storage demand', logic:'Google AI training corpus requires massive cold storage — WDC is primary supplier. GOOGL capex beats signal HDD order expansion.' },
    { ticker:'AMZN', metric:'capex', lag:1, direction:'positive', weight:0.15, desc:'AWS cold storage capex → WDC HDD orders', logic:'AWS S3 Glacier and deep archive uses WDC HDDs. AMZN capex signals NAND and HDD demand expansion.' }
  ]},

  // ── MPWR: driven by NVDA AI server power management ─────────
  MPWR: { name:'Monolithic Power Systems', upstream:[
    { ticker:'NVDA', metric:'revenue', lag:1, direction:'positive', weight:0.60, desc:'NVDA AI server revenue → MPWR power management chip demand', logic:'MPWR power modules are designed into NVDA Blackwell server platforms. NVDA revenue beats signal MPWR content-per-server growth.' },
    { ticker:'MSFT', metric:'capex', lag:1, direction:'positive', weight:0.25, desc:'MSFT AI datacenter capex → MPWR datacenter power demand', logic:'AI datacenters require advanced power management. MSFT capex beats expand MPWR datacenter segment demand.' },
    { ticker:'META', metric:'capex', lag:0, direction:'positive', weight:0.15, desc:'Meta AI infrastructure capex → MPWR power chip demand', logic:'Meta custom AI silicon uses MPWR power management. Meta capex signals MPWR custom silicon design wins.' }
  ]},

  // ── CFLT: driven by cloud platform adoption ───────────────────
  CFLT: { name:'Confluent', upstream:[
    { ticker:'AMZN', metric:'revenue', lag:1, direction:'positive', weight:0.45, desc:'AWS marketplace revenue → Confluent Cloud demand', logic:'Confluent AWS Marketplace revenue +88% YoY — tracks AWS enterprise adoption. AMZN AWS beats signal CFLT channel expansion.' },
    { ticker:'MSFT', metric:'revenue', lag:1, direction:'positive', weight:0.30, desc:'Azure OpenAI service revenue → Confluent AI streaming demand', logic:'Azure OpenAI deployments need real-time streaming. MSFT Azure revenue beats signal CFLT AI pipeline expansion.' },
    { ticker:'GOOGL', metric:'revenue', lag:1, direction:'positive', weight:0.25, desc:'GCP enterprise revenue → Confluent streaming adoption', logic:'GCP enterprise adoption drives Confluent multi-cloud deployments. GOOGL cloud beats signal CFLT GCP channel growth.' }
  ]},

  // ── GTLB: driven by cloud DevSecOps adoption ─────────────────
  GTLB: { name:'GitLab', upstream:[
    { ticker:'MSFT', metric:'revenue', lag:1, direction:'positive', weight:0.40, desc:'Azure DevOps revenue → GitLab enterprise competition/migration signal', logic:'MSFT Azure DevOps growth signals enterprise DevOps budget expansion — GitLab captures migration share with better AI tools (Duo vs Copilot).' },
    { ticker:'AMZN', metric:'revenue', lag:1, direction:'positive', weight:0.35, desc:'AWS CodePipeline revenue → GitLab DevSecOps pull-through', logic:'AWS CodeSuite deployments often pair with GitLab for security scanning. AMZN cloud beats signal DevSecOps budget expansion.' },
    { ticker:'GOOGL', metric:'revenue', lag:1, direction:'positive', weight:0.25, desc:'GCP cloud revenue → GitLab GCP marketplace adoption', logic:'GitLab is native on GCP for government and enterprise. GOOGL cloud revenue beats signal GTLB GCP channel expansion.' }
  ]},

  // ── TTD: driven by Meta/Google ad market dynamics ────────────
  TTD: { name:'The Trade Desk', upstream:[
    { ticker:'META', metric:'revenue', lag:0, direction:'positive', weight:0.50, desc:'Meta ad revenue → programmatic CTV market size signal', logic:'Meta ad revenue growth signals overall digital ad market health. Strong Meta revenue = healthy ad budgets flowing to open internet via TTD.' },
    { ticker:'GOOGL', metric:'revenue', lag:0, direction:'positive', weight:0.50, desc:'Google ad revenue → CTV programmatic market signal', logic:'GOOGL ad revenue signals total TV+digital ad market size. YouTube CTV growth validates the shift TTD benefits from on open internet.' }
  ]},

  // ── RIVN: driven by Amazon EV fleet contract ─────────────────
  RIVN: { name:'Rivian Automotive', upstream:[
    { ticker:'AMZN', metric:'revenue', lag:0, direction:'positive', weight:0.70, desc:'AMZN revenue → Rivian EDV fleet delivery cadence', logic:'Amazon 100K EDV contract is RIVN largest customer. AMZN revenue beats signal fleet delivery acceleration and potential order expansion.' },
    { ticker:'TSLA', metric:'revenue', lag:1, direction:'positive', weight:0.30, desc:'Tesla EV market signal → Rivian R2 demand validation', logic:'Tesla revenue beats validate consumer EV demand. Strong TSLA sales signal RIVN R2 launch into healthy market conditions.' }
  ]},

  // ── FSLR: driven by AI datacenter power demand ───────────────
  FSLR: { name:'First Solar', upstream:[
    { ticker:'MSFT', metric:'capex', lag:2, direction:'positive', weight:0.35, desc:'MSFT AI datacenter capex → utility solar PPA demand', logic:'Microsoft has committed to 100% renewable energy. MSFT capex beats signal utility solar PPA demand expansion — FSLR primary beneficiary.' },
    { ticker:'GOOGL', metric:'capex', lag:2, direction:'positive', weight:0.35, desc:'Google AI datacenter capex → solar energy contract demand', logic:'Google largest corporate buyer of renewable energy. GOOGL capex beats signal utility solar contract acceleration at FSLR domestic production prices.' },
    { ticker:'META', metric:'capex', lag:2, direction:'positive', weight:0.30, desc:'Meta datacenter capex → renewable energy procurement', logic:'Meta AI datacenter expansion requires renewable energy commitments. Meta capex beats signal incremental utility solar demand in FSLR book-to-bill.' }
  ]},

  // ── TWLO: driven by cloud platform adoption ───────────────────
  TWLO: { name:'Twilio', upstream:[
    { ticker:'AMZN', metric:'revenue', lag:1, direction:'positive', weight:0.40, desc:'AWS revenue → Twilio Segment CDP cloud integration demand', logic:'Twilio Segment integrates natively with AWS data services. AMZN AWS beats signal enterprise CDP budget expansion benefiting TWLO.' },
    { ticker:'MSFT', metric:'revenue', lag:1, direction:'positive', weight:0.35, desc:'Azure revenue → Twilio communications API enterprise adoption', logic:'Twilio communications APIs are embedded in Azure enterprise deployments. MSFT enterprise cloud revenue beats signal TWLO API expansion.' },
    { ticker:'META', metric:'revenue', lag:0, direction:'positive', weight:0.25, desc:'Meta ad revenue → e-commerce communications spend', logic:'Meta ad revenue growth signals e-commerce health. Strong e-commerce = more Twilio customer messaging, abandoned cart, and order notification API calls.' }
  ]},

  // ── AXON: driven by DoD/federal AI safety contracts ──────────
  AXON: { name:'Axon Enterprise', upstream:[
    { ticker:'__DOD_AI__', metric:'contracts', lag:0, direction:'positive', weight:0.55, desc:'Federal AI law enforcement contracts → Axon Evidence.com expansion', logic:'Federal law enforcement AI mandates drive Axon Evidence.com deployments. DoD/DHS AI contracts signal Axon federal pipeline expansion.' },
    { ticker:'__SAM_GOV__', metric:'contracts', lag:1, direction:'positive', weight:0.45, desc:'Municipal/state law enforcement contracts → Axon body camera revenue', logic:'SAM.gov law enforcement contract awards signal Axon TASER + body camera pipeline. State/local procurement tracks federal mandates with 1-2 quarter lag.' }
  ]},

  // ── 150-stock expansion: new supply chain relationships ──────
  MRNA: { name:'Moderna', upstream:[
    { ticker:'ILMN', metric:'sequencing_revenue', lag:8, direction:'positive', weight:0.55, desc:'Illumina sequencing → mRNA target identification', logic:'Illumina RNA sequencing identifies mRNA drug targets. Sequencing revenue growth signals pipeline expansion for mRNA therapeutics.' },
    { ticker:'__FRED_BIO__', metric:'NIH_grants', lag:4, direction:'positive', weight:0.45, desc:'NIH biotech funding → mRNA clinical trial volume', logic:'NIH grant increases signal more mRNA programs entering clinical stage, driving Moderna pipeline breadth.' }
  ]},
  REGN: { name:'Regeneron', upstream:[
    { ticker:'ILMN', metric:'genomics_revenue', lag:12, direction:'positive', weight:0.60, desc:'Illumina genomics → antibody target identification', logic:'Illumina sequencing platforms identify antibody drug targets. Genomics revenue is leading indicator for next-gen REGN antibody pipeline depth.' },
    { ticker:'AMGN', metric:'revenue', lag:2, direction:'positive', weight:0.40, desc:'Amgen biotech revenue → biologic reimbursement environment', logic:'Amgen revenue growth signals favorable biologic drug reimbursement environment, benefiting REGN\'s Dupixent and Praluent pricing power.' }
  ]},
  DXCM: { name:'DexCom', upstream:[
    { ticker:'REGN', metric:'diabetes_revenue', lag:4, direction:'positive', weight:0.50, desc:'GLP-1 CGM retention → DexCom installed base growth', logic:'GLP-1 prescriptions drive CGM demand. Diabetes treatment revenue is leading indicator for DexCom sensor subscription growth.' },
    { ticker:'ILMN', metric:'diagnostics', lag:8, direction:'positive', weight:0.50, desc:'Precision diagnostics adoption → continuous monitoring standard of care', logic:'Illumina precision diagnostics growth signals shift to continuous monitoring as standard of care, expanding CGM market.' }
  ]},
  VRT: { name:'Vertiv Holdings', upstream:[
    { ticker:'NVDA', metric:'datacenter_revenue', lag:2, direction:'positive', weight:0.50, desc:'NVIDIA GPU sales → datacenter power/cooling demand', logic:'Every NVIDIA GPU sold requires Vertiv power and cooling infrastructure. Datacenter revenue is a 1-2 quarter leading indicator for Vertiv orders.' },
    { ticker:'EQIX', metric:'capex', lag:3, direction:'positive', weight:0.30, desc:'Equinix datacenter capex → critical infrastructure orders', logic:'Equinix capex expansion directly drives Vertiv UPS, PDU, and cooling equipment orders for each new IBX facility.' },
    { ticker:'META', metric:'capex', lag:3, direction:'positive', weight:0.20, desc:'Meta AI datacenter buildout → Vertiv cooling contracts', logic:'Meta AI infrastructure capex (Project Aria, LLaMA training clusters) requires Vertiv liquid cooling systems at scale.' }
  ]},
  EQIX: { name:'Equinix', upstream:[
    { ticker:'NVDA', metric:'datacenter_revenue', lag:4, direction:'positive', weight:0.40, desc:'AI chip sales → colocation demand', logic:'NVDA AI chip deployments require co-location for network interconnect. Datacenter revenue growth predicts Equinix cabinet bookings 1 quarter ahead.' },
    { ticker:'META', metric:'capex', lag:2, direction:'positive', weight:0.30, desc:'Hyperscaler AI capex → xScale colocation contracts', logic:'Meta AI infrastructure capex drives xScale facility orders at Equinix. Hyperscaler capex guidance is direct leading indicator for Equinix bookings.' },
    { ticker:'MSFT', metric:'azure_capex', lag:2, direction:'positive', weight:0.30, desc:'Azure expansion → Equinix interconnection demand', logic:'Azure regional expansion drives enterprise Equinix demand for Azure interconnect access. MSFT cloud capex is colocation leading indicator.' }
  ]},
  DLR: { name:'Digital Realty', upstream:[
    { ticker:'MSFT', metric:'azure_capex', lag:4, direction:'positive', weight:0.40, desc:'Microsoft hyperscale demand → DLR pre-commitment revenue', logic:'Microsoft Azure hyperscale expansion drives DLR pre-commitment bookings. Azure capex guidance predicts DLR multi-year contracts.' },
    { ticker:'NVDA', metric:'datacenter_revenue', lag:3, direction:'positive', weight:0.35, desc:'AI chip density → datacenter real estate demand', logic:'High-density AI racks require new DLR construction. NVDA datacenter revenue growth predicts DLR new development starts.' },
    { ticker:'ORCL', metric:'cloud_revenue', lag:3, direction:'positive', weight:0.25, desc:'Oracle Cloud expansion → DLR campus development', logic:'Oracle Cloud Infrastructure expansion drives DLR campus builds. OCI capex commitments appear in DLR bookings within 1 quarter.' }
  ]},
  KTOS: { name:'Kratos Defense', upstream:[
    { ticker:'LMT', metric:'defense_revenue', lag:2, direction:'positive', weight:0.45, desc:'Lockheed defense contracts → autonomous systems sub-contracts', logic:'LMT autonomous systems programs (F-35, LRSO) drive Kratos sub-contract awards for drone target systems and electronic warfare.' },
    { ticker:'__DOD_AI__', metric:'contracts', lag:1, direction:'positive', weight:0.55, desc:'DoD AI/autonomous contracts → Kratos direct awards', logic:'DoD autonomous weapons and AI contracts are direct Kratos award signal. Drone budget line items directly fund Kratos programs.' }
  ]},
  LDOS: { name:'Leidos', upstream:[
    { ticker:'__DOD_AI__', metric:'contracts', lag:2, direction:'positive', weight:0.60, desc:'DoD IT/AI contracts → Leidos prime award pipeline', logic:'DoD digital transformation and AI contracts flow to Leidos as primary IT services prime. Budget increases directly correlate with backlog growth.' },
    { ticker:'SAIC', metric:'revenue', lag:1, direction:'positive', weight:0.40, desc:'Defense IT spending → sector-wide revenue growth', logic:'SAIC and Leidos compete for same DoD IT contracts. SAIC revenue growth signals healthy defense IT budget execution, benefiting LDOS similarly.' }
  ]},
  MELI: { name:'MercadoLibre', upstream:[
    { ticker:'V', metric:'latam_volume', lag:2, direction:'positive', weight:0.50, desc:'LatAm payment volume → Mercado Pago fintech growth', logic:'Visa Latin America payment volume growth signals digital payment adoption, directly benefiting Mercado Pago which competes in the same ecosystem.' },
    { ticker:'AMZN', metric:'international_revenue', lag:3, direction:'positive', weight:0.50, desc:'Amazon international expansion → LatAm e-commerce market validation', logic:'Amazon international investment in LatAm validates market size. AMZN entering Brazil drives e-commerce adoption that benefits MELI as the incumbent.' }
  ]},
  DUOL: { name:'Duolingo', upstream:[
    { ticker:'MSFT', metric:'openai_integration', lag:2, direction:'positive', weight:0.60, desc:'OpenAI/GPT-4 capability → Duolingo AI Companion quality', logic:'OpenAI model improvements directly enhance Duolingo Max AI tutor quality. MSFT OpenAI partnership investment signals Duolingo feature quality roadmap.' },
    { ticker:'GOOGL', metric:'education_spend', lag:3, direction:'positive', weight:0.40, desc:'Google education platform growth → language learning market expansion', logic:'Google education platform adoption (Workspace for Education) signals digital learning normalization, expanding Duolingo\'s addressable market.' }
  ]},
  NTNX: { name:'Nutanix', upstream:[
    { ticker:'NVDA', metric:'enterprise_ai', lag:3, direction:'positive', weight:0.55, desc:'NVIDIA enterprise AI → on-premises AI workload demand', logic:'NVIDIA enterprise AI deployments increasingly use Nutanix for on-prem GPU clusters (GPT-in-a-Box). NVDA AI revenue predicts Nutanix ACV growth.' },
    { ticker:'VMW', metric:'enterprise_disruption', lag:2, direction:'negative', weight:0.45, desc:'VMware pricing disruption → Nutanix competitive wins', logic:'Broadcom VMware price increases drive enterprise migration to Nutanix. VMware price disruption (negative for users) is positive leading indicator for Nutanix.' }
  ]},
  ROKU: { name:'Roku', upstream:[
    { ticker:'NFLX', metric:'ad_revenue', lag:2, direction:'positive', weight:0.45, desc:'Netflix ad tier growth → CTV advertising market expansion', logic:'Netflix ad-supported tier growth validates CTV advertising market size. Netflix ad revenue growth drives Roku as measurement and delivery partner.' },
    { ticker:'AMZN', metric:'prime_video_ads', lag:2, direction:'positive', weight:0.35, desc:'Amazon Prime Video ads → retail media CTV channel growth', logic:'Amazon Prime Video ad launch validates retail media CTV channel. Amazon ad revenue growth drives Roku\'s retail media attribution product.' },
    { ticker:'GOOGL', metric:'youtube_ads', lag:1, direction:'positive', weight:0.20, desc:'YouTube CTV ad growth → CTV advertising market size', logic:'YouTube Connected TV revenue is the bellwether for CTV ad spend. YouTube CTV growth directly validates Roku\'s addressable market expansion.' }
  ]},
  FLUT: { name:'Flutter Entertainment', upstream:[
    { ticker:'__SAM_GOV__', metric:'state_legalization', lag:1, direction:'positive', weight:0.65, desc:'State sports betting legalization → Flutter market expansion', logic:'State legislation legalizing sports betting directly adds to Flutter/FanDuel TAM. Each state legalization adds $300M-$2B to addressable market.' },
    { ticker:'DIS', metric:'espn_revenue', lag:2, direction:'positive', weight:0.35, desc:'ESPN sports audience → Flutter user acquisition', logic:'ESPN+ and ESPN Bet partnership means ESPN audience growth directly fuels FanDuel user acquisition. Disney sports media revenue signals Flutter CAC efficiency.' }
  ]},
  PINS: { name:'Pinterest', upstream:[
    { ticker:'AMZN', metric:'advertising_revenue', lag:2, direction:'positive', weight:0.55, desc:'Amazon ad expansion → Pinterest shoppable catalog growth', logic:'Amazon advertising expansion drives Pinterest shoppable integration depth. Amazon ad revenue growth signals more merchant catalog integration for Pinterest checkout.' },
    { ticker:'SHOP', metric:'merchant_revenue', lag:3, direction:'positive', weight:0.45, desc:'Shopify merchant growth → Pinterest product catalog expansion', logic:'Shopify merchant base growth directly expands Pinterest shoppable product catalog. 1.7M Shopify merchants sync inventory to Pinterest boards.' }
  ]},
  ALB: { name:'Albemarle', upstream:[
    { ticker:'TSLA', metric:'production', lag:6, direction:'positive', weight:0.40, desc:'Tesla EV production → lithium demand signal', logic:'Tesla vehicle production is leading indicator for lithium demand. Each Tesla vehicle requires ~10kg lithium carbonate equivalent.' },
    { ticker:'GM', metric:'ev_production', lag:6, direction:'positive', weight:0.30, desc:'GM Ultium EV ramp → lithium supply contract execution', logic:'GM EV production ramp activates Albemarle lithium supply agreements. GM Ultium volumes directly drive ALB offtake.' },
    { ticker:'F', metric:'f150_lightning', lag:5, direction:'positive', weight:0.30, desc:'Ford EV ramp → lithium demand growth', logic:'Ford F-150 Lightning and E-Transit production activates lithium supply agreements with Albemarle from BlueOval battery plants.' }
  ]},
  VRT: { name:'Vertiv Holdings', upstream:[
    { ticker:'NVDA', metric:'datacenter_revenue', lag:2, direction:'positive', weight:0.50, desc:'NVIDIA GPU demand → datacenter power/cooling spend', logic:'Each NVDA GPU datacenter sale drives Vertiv UPS and cooling equipment. Datacenter revenue is 1-2 quarter leading indicator for Vertiv backlog.' },
    { ticker:'EQIX', metric:'capex', lag:3, direction:'positive', weight:0.30, desc:'Equinix new datacenter builds → Vertiv critical power contracts', logic:'Equinix capex per IBX facility drives Vertiv equipment orders. Each new facility is a $20-40M Vertiv opportunity.' },
    { ticker:'META', metric:'capex', lag:3, direction:'positive', weight:0.20, desc:'Meta AI datacenter capex → liquid cooling demand', logic:'Meta AI cluster buildout requires Vertiv liquid cooling at 50kW/rack density for GB200 NVL72.' }
  ]},
  SAIC: { name:'SAIC', upstream:[
    { ticker:'LDOS', metric:'contracts', lag:1, direction:'positive', weight:0.55, desc:'Defense IT contracts → SAIC competitive pipeline', logic:'Leidos and SAIC compete for same DoD IT programs. LDOS contract wins signal active procurement cycles benefiting SAIC on alternate awards.' },
    { ticker:'__DOD_AI__', metric:'contracts', lag:2, direction:'positive', weight:0.45, desc:'DoD AI mandate → SAIC JADC2 integration revenue', logic:'DoD JADC2 and AI mandate drives SAIC Systems Integration services. Defense AI budget increases directly flow to SAIC program awards.' }
  ]},
  UPST: { name:'Upstart', upstream:[
    { ticker:'__FRED_MACRO__', metric:'10y_treasury', lag:2, direction:'negative', weight:0.70, desc:'Rate cycle inflection → Upstart lending volume recovery', logic:'Fed rate cuts directly unfreeze consumer lending. Each 25bps cut increases Upstart loan volume by ~8% as bank partner risk appetite increases.' },
    { ticker:'HOOD', metric:'fintech_volume', lag:1, direction:'positive', weight:0.30, desc:'Retail fintech adoption → AI lending market growth', logic:'Robinhood user growth signals broader fintech adoption among millennials and Gen Z — same demographic as primary Upstart borrowers.' }
  ]},

};
