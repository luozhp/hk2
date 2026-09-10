<template>
  <div>
    <!-- 概览 -->
    <el-row :gutter="16">
      <el-col v-for="s in summary" :key="s.label" :xs="12" :md="6">
        <el-card shadow="never" class="stat-card">
          <div class="stat-value" :class="s.tone">{{ s.value }}</div>
          <div class="stat-label">{{ s.label }}</div>
        </el-card>
      </el-col>
    </el-row>

    <el-alert type="warning" :closable="false" show-icon class="lead-alert">
      <template #title>
        不要只押单一渠道。中小贸易商的稳健组合：<b>1 个付费流量渠道</b>（快速拿询盘）+ <b>1 个自有长期流量渠道</b>（SEO / 内容，复利）+ <b>转介绍维护</b>（转化最高）。
      </template>
    </el-alert>

    <el-card shadow="never" class="panel-card">
      <template #header>
        <div class="panel-head">
          <div class="panel-title">
            <el-icon class="panel-icon"><Promotion /></el-icon>
            <span>获客渠道全景</span>
          </div>
          <div class="panel-actions">
            <el-radio-group v-model="onlySupported" size="small">
              <el-radio-button :value="false">全部渠道</el-radio-button>
              <el-radio-button :value="true">仅看系统可承接</el-radio-button>
            </el-radio-group>
          </div>
        </div>
      </template>

      <el-alert
        title="每条渠道右侧标注了它在 Hunter 系统中的承接方式：绿色=已支持（点击直达功能页），橙色=部分支持/需人工，蓝色=规划中，灰色=暂未支持。"
        type="info" :closable="false" show-icon style="margin-bottom:16px" />

      <el-tabs v-model="tab" class="ch-tabs">
        <el-tab-pane label="国内 B2B 贸易" name="domestic">
          <div v-for="g in domesticGroups" :key="g.key" class="ch-group">
            <div class="group-head">
              <span class="group-bar" :style="{ background: g.color }"></span>
              <span class="group-title">{{ g.title }}</span>
              <span class="group-sub">{{ g.sub }}</span>
            </div>
            <div class="ch-grid">
              <div v-for="c in filterChannels(g.items)" :key="c.name" class="ch-card">
                <div class="ch-head">
                  <span class="ch-name">{{ c.name }}</span>
                  <el-tag
                    size="small" :type="sysType(c.system.status)" effect="light"
                    :class="c.system.path ? 'sys-link' : ''"
                    @click="go(c.system)">
                    {{ c.system.label }}
                  </el-tag>
                </div>
                <div class="ch-desc">{{ c.desc }}</div>
                <ul class="pc-list">
                  <li v-for="p in c.pros" :key="p"><el-icon class="ic-ok"><CircleCheck /></el-icon><span>{{ p }}</span></li>
                </ul>
                <ul class="pc-list">
                  <li v-for="n in c.cons" :key="n"><el-icon class="ic-no"><CircleClose /></el-icon><span>{{ n }}</span></li>
                </ul>
                <div class="ch-scene">适合：{{ c.scene }}</div>
              </div>
            </div>
          </div>
        </el-tab-pane>

        <el-tab-pane label="海外 B2B 外贸" name="overseas">
          <div v-for="g in overseasGroups" :key="g.key" class="ch-group">
            <div class="group-head">
              <span class="group-bar" :style="{ background: g.color }"></span>
              <span class="group-title">{{ g.title }}</span>
              <span class="group-sub">{{ g.sub }}</span>
            </div>
            <div class="ch-grid">
              <div v-for="c in filterChannels(g.items)" :key="c.name" class="ch-card">
                <div class="ch-head">
                  <span class="ch-name">{{ c.name }}</span>
                  <el-tag
                    size="small" :type="sysType(c.system.status)" effect="light"
                    :class="c.system.path ? 'sys-link' : ''"
                    @click="go(c.system)">
                    {{ c.system.label }}
                  </el-tag>
                </div>
                <div class="ch-desc">{{ c.desc }}</div>
                <ul class="pc-list">
                  <li v-for="p in c.pros" :key="p"><el-icon class="ic-ok"><CircleCheck /></el-icon><span>{{ p }}</span></li>
                </ul>
                <ul class="pc-list">
                  <li v-for="n in c.cons" :key="n"><el-icon class="ic-no"><CircleClose /></el-icon><span>{{ n }}</span></li>
                </ul>
                <div class="ch-scene">适合：{{ c.scene }}</div>
              </div>
            </div>
          </div>
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <!-- 快速对比 -->
    <el-card shadow="never" class="panel-card" style="margin-top:16px">
      <template #header>
        <div class="panel-head">
          <div class="panel-title">
            <el-icon class="panel-icon"><DataAnalysis /></el-icon>
            <span>快速对比（渠道选型速查）</span>
          </div>
        </div>
      </template>
      <el-table :data="compare" size="small" stripe>
        <el-table-column prop="type" label="渠道类型" width="220" />
        <el-table-column prop="pros" label="优点" min-width="200" />
        <el-table-column prop="cons" label="缺点" min-width="220" />
        <el-table-column prop="scene" label="适合场景" min-width="160" />
        <el-table-column label="系统承接" width="150">
          <template #default="{ row }">
            <el-tag size="small" :type="sysType(row.status)" effect="light">{{ row.sys }}</el-tag>
          </template>
        </el-table-column>
      </el-table>
      <div class="tip">
        <el-icon><InfoFilled /></el-icon>
        <span>冷启动期优先「主动拓客」快速补线索；同时并行铺「SEO / 独立站」这类复利资产；存量客户起来后，转介绍的获客成本最低，要主动经营而不是被动等待。</span>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const tab = ref('domestic');
const onlySupported = ref(false);

interface SysMark { label: string; status: 'ok' | 'part' | 'plan' | 'none'; path?: string }
interface Channel { name: string; desc: string; pros: string[]; cons: string[]; scene: string; system: SysMark }

// —— 系统承接标记：ok 已支持 / part 部分支持·需人工 / plan 规划中 / none 暂未支持 ——
const domesticGroups = ref<{ key: string; title: string; sub: string; color: string; items: Channel[] }[]>([
  {
    key: 'inbound', title: '线上 Inbound', sub: '客户主动来找你', color: '#409eff',
    items: [
      {
        name: 'B2B 平台（1688 / 爱采购 / 行业垂直站）',
        desc: '付费会员 + 站内推广，平台自带买家流量，靠搜索排名与询价分发获客。',
        pros: ['上手快，现成流量大', '交易与支付闭环成熟'],
        cons: ['比价严重、价格内卷', '受平台规则约束，客户不沉淀在自己手里'],
        scene: '标品走量、快速起量',
        system: { label: '询盘登记（platform）', status: 'part', path: '/inquiries' },
      },
      {
        name: '搜索 SEO（百度 / 360 官网优化）',
        desc: '围绕长尾关键词做官网内容与结构优化，客户带着需求主动搜过来。',
        pros: ['长期复利，一次投入持续获客', '客户意向明确'],
        cons: ['见效慢（通常 3–6 个月）', '需要持续内容与外链运营'],
        scene: '长期品牌与自有流量建设',
        system: { label: '暂未支持（面向 Google）', status: 'none' },
      },
      {
        name: '搜索竞价（百度竞价 / 信息流）',
        desc: '按点击付费拿搜索结果前排位置，快速获取意向询盘。',
        pros: ['上线即有流量，见效快', '可精准控制地域与关键词'],
        cons: ['持续花钱，停投即停流量', '热门词单价高，容易被恶意点击'],
        scene: '新品 / 新市场快速测试',
        system: { label: '暂未支持', status: 'none' },
      },
      {
        name: '短视频 & 内容平台（视频号 / 抖音 / 知乎）',
        desc: '工业、原料、设备类拍产品、工厂与交付案例，引流到企微成交。',
        pros: ['视频号 B 端客户质量偏高', '内容可反复复用、传播成本低'],
        cons: ['抖音泛流量多，筛客成本高', '需要持续内容产出'],
        scene: '需要眼见为实的品类、中小 B 客户',
        system: { label: '暂未支持', status: 'none' },
      },
      {
        name: '企业官网',
        desc: '展示产品、案例与资质，表单留资，是搜索与广告流量的承接池。',
        pros: ['自有私域入口，数据归属自己', '承接所有渠道流量的落地'],
        cons: ['没有流量导入等于零', '需持续维护内容与资质'],
        scene: '所有线上渠道的必备底座',
        system: { label: '落地页清单', status: 'part', path: '/keywords' },
      },
    ],
  },
  {
    key: 'outbound', title: '线上 Outbound', sub: '主动找客户', color: '#00c6ff',
    items: [
      {
        name: '企业大数据工具（企查查 / 天眼查）',
        desc: '按行业、规模、地区筛选企业，获取联系方式后电话、微信触达。',
        pros: ['线索量极大，几分钟可拉上千家', '可按注册资本、经营范围精准筛选'],
        cons: ['有效率偏低，号码多为前台或代理记账', '需要大量人工初筛'],
        scene: '冷启动缺客户、需要快速铺量',
        system: { label: '暂未支持（面向海外）', status: 'none' },
      },
      {
        name: '行业社群、微信群',
        desc: '行业协会群、产业集群群、上下游交流群，靠输出价值挖掘潜客。',
        pros: ['触达直接，容易建立熟络关系', '信息灵通，能捕获需求信号'],
        cons: ['难以规模化，靠人力经营', '群质量参差，容易被广告刷屏'],
        scene: '区域型、产业集群型生意',
        system: { label: '暂未支持', status: 'none' },
      },
      {
        name: '垂直行业网站、论坛',
        desc: '在行业门户、技术论坛发布案例与专业内容，被动获取线索。',
        pros: ['受众精准，专业内容信任度高', '内容长尾效应'],
        cons: ['流量规模有限', '转化周期长'],
        scene: '技术型、非标定制类',
        system: { label: '暂未支持', status: 'none' },
      },
    ],
  },
  {
    key: 'offline', title: '线下渠道', sub: '当面建立信任', color: '#8b5cf6',
    items: [
      {
        name: '行业展会、专业博览会',
        desc: '集中对接上下游，当面看样品、谈规格，适合快速建立信任。',
        pros: ['信任建立快，可现场看样', '一次集中拿大量名片'],
        cons: ['展位 + 差旅 + 样品成本高', '一年场次有限，需提前半年筹备'],
        scene: '高客单、需要看样品的生意',
        system: { label: '国际专业展会', status: 'ok', path: '/expos' },
      },
      {
        name: '行业协会、商会',
        desc: '通过会员名录、研讨会、沙龙接触同行与上下游资源。',
        pros: ['信任背书强，客户精准', '能获取行业一手信息'],
        cons: ['入会有门槛与年费', '覆盖企业数量有限'],
        scene: '需要资质背书的行业',
        system: { label: '线索批量导入', status: 'part', path: '/leads' },
      },
      {
        name: '地推 / 上门拜访',
        desc: '针对本地或周边工厂、工程商、批发商直接上门。',
        pros: ['成交质量高，能实地判断实力', '竞争少，关系粘性强'],
        cons: ['人力与时间成本极高', '辐射范围受限'],
        scene: '区域型高客单、需要现场勘测',
        system: { label: '客户管理（跟进记录）', status: 'part', path: '/customers' },
      },
    ],
  },
  {
    key: 'private', title: '私域 & 转介绍', sub: '质量最高', color: '#34d399',
    items: [
      {
        name: '老客户转介绍',
        desc: '维护存量客户，设置推荐激励，让客户主动介绍同行。',
        pros: ['意向最强、转化率最高', '获客成本几乎为零'],
        cons: ['产出不可控，无法规模复制', '必须主动经营，不能被动等待'],
        scene: '全阶段，尤其存量客户起来后',
        system: { label: '询盘渠道 referral', status: 'ok', path: '/inquiries' },
      },
      {
        name: '合作伙伴互推',
        desc: '互补行业的经销商、上游工厂互相导流客户。',
        pros: ['客户匹配度高', '可长期互换资源'],
        cons: ['依赖双方信任与利益分配', '需要持续维护关系'],
        scene: '产品线互补、客户群重叠',
        system: { label: '询盘渠道 referral', status: 'part', path: '/inquiries' },
      },
      {
        name: '企业微信私域运营',
        desc: '沉淀全部客户到企微，持续输出报价、新品与案例，促进二次复购。',
        pros: ['可反复触达，复购成本低', '客户资产沉淀在公司而非个人'],
        cons: ['运营需要专人', '内容输出频率要求高'],
        scene: '复购型、耗材型生意',
        system: { label: '暂未支持', status: 'none' },
      },
    ],
  },
]);

const overseasGroups = ref<{ key: string; title: string; sub: string; color: string; items: Channel[] }[]>([
  {
    key: 'inbound', title: '线上 Inbound', sub: '买家主动询盘', color: '#409eff',
    items: [
      {
        name: '外贸 B2B 平台（阿里国际站 / 中国制造网 / 环球资源）',
        desc: '平台自带海外买家流量，开店即可收到询盘，是最常见的出海起步方式。',
        pros: ['上手快，平台自带买家流量', '交易、信保、物流配套成熟'],
        cons: ['同行比价内卷严重', '询盘质量参差不齐，平台规则约束强'],
        scene: '出海起步、标品走量',
        system: { label: '询盘登记（platform）', status: 'part', path: '/inquiries' },
      },
      {
        name: '独立站 + Google SEO',
        desc: '围绕采购意图关键词优化独立站，获取 Google 自然搜索流量。',
        pros: ['客户是主动采购意向，质量高', '流量与数据完全属于自己，长期复利'],
        cons: ['见效周期 2–6 个月', '需要持续内容、外链与技术维护'],
        scene: '长期品牌建设与自有流量',
        system: { label: '关键词库 + 落地页清单', status: 'ok', path: '/keywords' },
      },
      {
        name: 'Google Ads 付费广告',
        desc: '定向国家与产品关键词投放搜索广告，上线即有流量。',
        pros: ['即投即有曝光与询盘', '可精准定向国家、语言、设备'],
        cons: ['持续花钱，停投流量立刻消失', '小预算测试期容易踩坑烧钱'],
        scene: '新市场 / 新品快速测试',
        system: { label: '广告管理（规划中）', status: 'plan' },
      },
      {
        name: '海外垂直行业平台（Thomasnet / Europages / Kompass 等 20 个）',
        desc: '各行业专业采购网站，买家目的性强，按品类与地区检索供应商。',
        pros: ['买家专业度高，竞争小于大平台', '行业匹配精准'],
        cons: ['多为付费收录，年费不低', '流量规模小于综合平台'],
        scene: '工业品、机械、原料类',
        system: { label: '暂未支持', status: 'none' },
      },
    ],
  },
  {
    key: 'outbound', title: '线上 Outbound', sub: '主动开发', color: '#00c6ff',
    items: [
      {
        name: 'LinkedIn 领英',
        desc: '筛选海外采购经理、批发商、进口商，配合 Sales Navigator 定向触达。',
        pros: ['B2B 外贸最重要的社媒，可直接找到决策人', '可验证公司规模与人脉关系'],
        cons: ['需要长期养号与内容', '加好友与回复率有限，易触发限制'],
        scene: '定制类、需要找决策人的生意',
        system: { label: '规划中（V1.2）', status: 'plan' },
      },
      {
        name: '海关数据',
        desc: '通过真实进口记录找到有采购历史的买家，判断其采购规模与频次。',
        pros: ['买家有真实采购记录，需求真实', '可判断采购量、供应商与周期'],
        cons: ['数据存在 1–3 个月延迟', '部分清关主体是货代，需要甄别'],
        scene: '找有实际进口记录的活跃买家',
        system: { label: '海关数据（导入模式）', status: 'part', path: '/customs' },
      },
      {
        name: '谷歌搜索挖掘客户',
        desc: '用关键词组合搜索海外 distributor / importer / wholesaler 官网，提取邮箱与 WhatsApp。',
        pros: ['免费，覆盖全球', '可按国家、品类、渠道角色精准组合'],
        cons: ['需要大量人工筛选与验证', '邮箱质量参差，需做有效性校验'],
        scene: '冷启动、预算有限时',
        system: { label: '线索采集（google）', status: 'ok', path: '/discover' },
      },
      {
        name: '邮件开发 / WhatsApp 开发',
        desc: '写开发信或即时消息触达潜在客户，是最经典的外贸主动开发方式。',
        pros: ['成本极低，可规模化', '内容可个性化，直击痛点'],
        cons: ['大量群发容易进垃圾箱', '模板化开发信回复率极低，必须个性化'],
        scene: '已有精准名单后的批量触达',
        system: { label: '邮件中心', status: 'ok', path: '/mail' },
      },
      {
        name: '海外社媒（Facebook / Instagram / TikTok B 端）',
        desc: '通过 Facebook 群组、企业主页与 Meta 广告触达海外买家。',
        pros: ['用户基数大，可投放定向广告', '内容形式丰富，易展示产品'],
        cons: ['B 端意图弱于 LinkedIn', '需要持续投放与内容运营'],
        scene: '消费品、轻工类、视觉化产品',
        system: { label: '暂未支持', status: 'none' },
      },
    ],
  },
  {
    key: 'offline', title: '线下渠道', sub: '面对面谈单', color: '#8b5cf6',
    items: [
      {
        name: '国际专业展会（广交会 / 海外本土行业展）',
        desc: '面对面谈单、看样品、验厂，是外贸大单的重要来源。',
        pros: ['信任建立最快，大单机会多', '可一次性接触大量目标买家'],
        cons: ['成本极高（差旅 + 展位 + 样品）', '一年场次有限，筹备周期长'],
        scene: '高客单、需要看样品验厂的生意',
        system: { label: '国际专业展会', status: 'ok', path: '/expos' },
      },
      {
        name: '海外本地经销商拜访',
        desc: '出国拜访老客户的同时，顺路开发周边潜在合作商。',
        pros: ['一次出行多重目的，摊薄成本', '当面拜访信任度最高'],
        cons: ['差旅成本高，签证与行程复杂', '需要提前预约，成行率不确定'],
        scene: '已有海外客户基础后的深耕',
        system: { label: '客户管理（跟进记录）', status: 'part', path: '/customers' },
      },
    ],
  },
  {
    key: 'referral', title: '转介绍 & 合作伙伴', sub: '线索质量最高', color: '#34d399',
    items: [
      {
        name: '老买家转介绍',
        desc: '维护已有海外买家关系，主动请求推荐同行或上下游。',
        pros: ['转化率最高，几乎零成本', '客户已带背书，谈判阻力小'],
        cons: ['产出不可控，依赖关系深度', '需要主动开口与激励机制'],
        scene: '全阶段，重点经营',
        system: { label: '询盘渠道 referral', status: 'ok', path: '/inquiries' },
      },
      {
        name: '合作伙伴推荐（货代 / 报关行 / 互补供应商）',
        desc: '与货代、报关行、互补品类的供应商互相推荐客户。',
        pros: ['线索质量高，客户画像互补', '信息来源一手且及时'],
        cons: ['依赖长期关系维护', '需要利益共享机制'],
        scene: '有稳定服务链的外贸业务',
        system: { label: '询盘渠道 referral', status: 'part', path: '/inquiries' },
      },
    ],
  },
]);

const compare = ref([
  { type: 'B2B 平台', pros: '上手快，现成流量', cons: '价格内卷，平台规则约束', scene: '标品走量', sys: '询盘登记', status: 'part' },
  { type: '搜索 SEO / 独立站', pros: '自有流量，客户意向高', cons: '见效慢，需要持续运营', scene: '长期品牌建设', sys: '关键词库 + 落地页', status: 'ok' },
  { type: '付费广告', pros: '快速拿询盘', cons: '持续花钱，停投无流量', scene: '新品 / 新市场测试', sys: '广告管理（规划中）', status: 'plan' },
  { type: '社媒（LinkedIn / 视频号 / 抖音）', pros: '可触达决策人', cons: '需要持续内容输出', scene: '中小 B、定制类', sys: '规划中（V1.2）', status: 'plan' },
  { type: '展会', pros: '信任强，大单机会', cons: '成本高、场次有限', scene: '高客单、需要看样品', sys: '线索采集（名录）', status: 'ok' },
  { type: '主动拓客（海关数据 / 企查查 / 搜索挖掘）', pros: '线索海量', cons: '筛选成本高，回复率低', scene: '冷启动缺客户', sys: '线索采集 + 邮件中心', status: 'ok' },
  { type: '老客户转介绍', pros: '转化率最高', cons: '产出不可控', scene: '全阶段，重点经营', sys: '询盘渠道 referral', status: 'ok' },
] as any[]);

const allChannels = computed(() => {
  const list: Channel[] = [];
  [...domesticGroups.value, ...overseasGroups.value].forEach((g) => list.push(...g.items));
  return list;
});

const summary = computed(() => {
  const list = allChannels.value;
  const count = (s: string) => list.filter((c) => c.system.status === s).length;
  return [
    { label: '渠道总数', value: list.length, tone: '' },
    { label: '系统已支持', value: count('ok'), tone: 'ok' },
    { label: '部分支持 / 需人工', value: count('part'), tone: 'warn' },
    { label: '规划中 / 暂未支持', value: count('plan') + count('none'), tone: 'muted' },
  ];
});

const filterChannels = (items: Channel[]) =>
  onlySupported.value ? items.filter((c) => ['ok', 'part'].includes(c.system.status)) : items;

const sysType = (s: string) =>
  ({ ok: 'success', part: 'warning', plan: 'primary', none: 'info' } as any)[s] || 'info';

const go = (sys: SysMark) => {
  if (sys.path) router.push(sys.path);
};
</script>

<style scoped>
.stat-card { border-radius: 12px; text-align: center; transition: box-shadow 0.25s ease; }
.stat-card:hover { box-shadow: 0 10px 28px rgba(15, 23, 42, 0.1); }
.stat-value { font-size: 26px; font-weight: 700; color: #1f2937; font-variant-numeric: tabular-nums; }
.stat-value.ok { color: #16a34a; }
.stat-value.warn { color: #d97706; }
.stat-value.muted { color: #94a3b8; }
.stat-label { font-size: 12px; color: #909399; margin-top: 4px; }

.lead-alert { margin-top: 16px; border-radius: 12px; }
.panel-card { border-radius: 12px; margin-top: 16px; }
.panel-head { display: flex; justify-content: space-between; align-items: center; }
.panel-title { display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 600; color: #1f2937; }
.panel-icon { color: #409eff; font-size: 16px; }

/* 分组 */
.ch-group { margin-bottom: 26px; }
.group-head { display: flex; align-items: baseline; gap: 8px; margin-bottom: 12px; }
.group-bar { width: 4px; height: 15px; border-radius: 2px; display: inline-block; }
.group-title { font-size: 14px; font-weight: 600; color: #1f2937; }
.group-sub { font-size: 12px; color: #c0c4cc; }

/* 渠道卡片 */
.ch-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(330px, 1fr)); gap: 14px; }
.ch-card {
  border: 1px solid #eef2f7; border-radius: 12px; padding: 14px 16px; background: #fff;
  transition: box-shadow 0.25s ease, border-color 0.25s ease;
}
.ch-card:hover { box-shadow: 0 8px 22px rgba(15, 23, 42, 0.08); border-color: #d6e8ff; }
.ch-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; }
.ch-name { font-size: 14px; font-weight: 600; color: #1f2937; line-height: 1.5; }
.sys-link { cursor: pointer; flex: none; }
.ch-desc { font-size: 12.5px; color: #6b7280; line-height: 1.7; margin: 8px 0 10px; }
.pc-list { list-style: none; padding: 0; margin: 0; }
.pc-list li { display: flex; gap: 6px; font-size: 12.5px; line-height: 1.9; color: #4b5563; }
.pc-list .el-icon { margin-top: 5px; flex: none; }
.ic-ok { color: #16a34a; }
.ic-no { color: #f56c6c; }
.ch-scene {
  margin-top: 10px; padding-top: 10px; border-top: 1px dashed #eef2f7;
  font-size: 12px; color: #909399;
}

.tip {
  display: flex; gap: 8px; margin-top: 14px; padding: 10px 12px; border-radius: 10px;
  background: #f0f7ff; border: 1px solid #d6e8ff; color: #334155; font-size: 12.5px; line-height: 1.8;
}
.tip .el-icon { color: #409eff; margin-top: 4px; flex: none; }

:deep(.el-table th.el-table__cell) { background: #f8fafc; color: #64748b; font-weight: 600; }
:deep(.el-table tbody tr:hover > td.el-table__cell) { background: #eef6ff; }
</style>
