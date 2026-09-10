<template>
  <div>
    <!-- 维护看板 -->
    <el-card shadow="never" class="head-card">
      <div class="head">
        <div class="head-left">
          <div class="title-badge"><el-icon><Service /></el-icon></div>
          <div>
            <h2 class="title">客户维护</h2>
            <p class="sub">
              按外贸实务维护存量客户：决策链、交易与产品、商务与信用条款、物流单证、合规资质、跟进与复购、售后与风险。
              系统自动预警逾期跟进、预计复购、协议/证件到期与流失风险。
            </p>
          </div>
        </div>
        <div class="head-right">
          <div class="stat"><div class="num warning">{{ ov.followDue ?? 0 }}</div><div class="lab">待跟进</div></div>
          <div class="stat"><div class="num primary">{{ ov.reorderSoon ?? 0 }}</div><div class="lab">30天内预计复购</div></div>
          <div class="stat"><div class="num">{{ ov.total ?? 0 }}</div><div class="lab">维护客户</div></div>
          <div class="stat"><div class="num success">{{ money(ov.totalOrderAmount) }}</div><div class="lab">累计成交</div></div>
        </div>
      </div>
      <div class="ov-row">
        <el-tag type="success" effect="plain">活跃 {{ ov.active ?? 0 }}</el-tag>
        <el-tag type="warning" effect="plain">需关注 {{ ov.watch ?? 0 }}</el-tag>
        <el-tag type="info" effect="plain">沉睡 {{ ov.dormant ?? 0 }}</el-tag>
        <el-tag type="danger" effect="plain">流失 {{ ov.churned ?? 0 }}</el-tag>
        <el-tag type="danger" effect="dark">高流失风险 {{ ov.highRisk ?? 0 }}</el-tag>
        <el-tag type="warning" effect="plain">协议30天内到期 {{ ov.agreementSoon ?? 0 }}</el-tag>
        <el-tag type="warning" effect="plain">证件60天内到期 {{ ov.certSoon ?? 0 }}</el-tag>
        <el-tag type="danger" effect="plain">有投诉记录 {{ ov.complaint ?? 0 }}</el-tag>
        <el-tag type="success" effect="plain">复购率 {{ ov.reorderRate ?? 0 }}%</el-tag>
      </div>
    </el-card>

    <!-- 维护台账 -->
    <el-card shadow="never" class="panel" style="margin-top:20px">
      <template #header>
        <div class="panel-head">
          <span><el-icon><Tickets /></el-icon> 客户维护台账</span>
          <div class="filters">
            <el-input v-model="filters.keyword" placeholder="客户 / 产品关键词" style="width:200px" clearable @keyup.enter="onFilter" />
            <el-select v-model="filters.status" placeholder="维护状态" style="width:130px" clearable @change="onFilter">
              <el-option v-for="s in statusOptions" :key="s.value" :label="s.label" :value="s.value" />
            </el-select>
            <el-select v-model="filters.risk" placeholder="流失风险" style="width:120px" clearable @change="onFilter">
              <el-option label="高" value="high" />
              <el-option label="中" value="medium" />
              <el-option label="低" value="low" />
            </el-select>
            <el-button type="primary" :icon="Plus" @click="openAdd">新增客户</el-button>
            <el-button :icon="Refresh" @click="loadRows">刷新</el-button>
          </div>
        </div>
      </template>

      <el-table :data="rows" v-loading="loading" stripe @row-click="openDetail" class="maint-table" :default-sort="{ prop: 'createdAt', order: 'descending' }" @sort-change="onSortChange">
        <el-table-column label="客户" min-width="200">
          <template #default="{ row }">
            <div class="cust-name">{{ row.companyName }}</div>
            <div class="cust-sub">{{ row.city || '—' }} · {{ row.country }} · {{ custTypeLabel(row.custType) }}</div>
          </template>
        </el-table-column>
        <el-table-column label="等级" width="90" sortable="custom" prop="level">
          <template #default="{ row }">
            <el-tag size="small" :type="gradeType(row.level)">{{ row.level }} 级</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="来源" width="170" show-overflow-tooltip sortable="custom" prop="source">
          <template #default="{ row }">
            <el-tag size="small" type="info" effect="plain">{{ sourceLabel(row.source) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="下次跟进" width="130" sortable="custom" prop="followDueDays">
          <template #default="{ row }">
            <span :class="['follow', followCell(row).cls]">{{ followCell(row).text }}</span>
          </template>
        </el-table-column>
        <el-table-column label="最近联系" width="130" sortable="custom" prop="lastContactDays">
          <template #default="{ row }">
            <span>{{ row.profile.lastContactDate || '—' }}</span>
            <span v-if="row.lastContactDays !== null" class="dim">（{{ row.lastContactDays }} 天前）</span>
          </template>
        </el-table-column>
        <el-table-column label="累计成交 / 复购" width="170">
          <template #default="{ row }">
            {{ money(row.profile.totalOrderAmount) }} · {{ row.profile.orderCount || 0 }} 次
          </template>
        </el-table-column>
        <el-table-column label="结算方式 / 账期" min-width="200">
          <template #default="{ row }">
            <span>{{ row.profile.paymentTerm || '—' }}</span>
            <el-tag v-if="row.profile.creditDays" size="small" type="warning" effect="plain" class="ml">
              账期 {{ row.profile.creditDays }} 天
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="维护状态" width="110">
          <template #default="{ row }">
            <el-tag size="small" :type="statusMeta(row.profile.status).type">{{ statusMeta(row.profile.status).label }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="流失风险" width="110">
          <template #default="{ row }">
            <el-tag size="small" :type="riskMeta(row.churnRisk).type">{{ riskMeta(row.churnRisk).label }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="新增日期" width="120" sortable="custom" prop="createdAt">
          <template #default="{ row }">
            <span>{{ row.createdAt ? row.createdAt.slice(0, 10) : '—' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="90" fixed="right">
          <template #default="{ row }">
            <el-button size="small" type="primary" plain @click.stop="openDetail(row)">维护</el-button>
          </template>
        </el-table-column>
      </el-table>
      <div class="maint-pager">
        <el-pagination
          layout="total, sizes, prev, pager, next"
          :total="total"
          :page-size="size"
          :current-page="page"
          :page-sizes="[20, 50, 100]"
          @current-change="onPageChange"
          @size-change="onSizeChange"
        />
      </div>
    </el-card>

    <!-- 客户维护档案 -->
    <el-drawer v-model="drawer" size="68%">
      <template #header>
        <div class="drawer-head">
          <div class="dh-left">
            <div class="dh-top">
              <span class="dh-title">{{ current?.company?.name || '客户维护档案' }}</span>
              <el-tag size="small" :type="gradeType(current?.company?.level)">{{ current?.company?.level || '-' }} 级</el-tag>
              <el-tag size="small" :type="statusMeta(form.status).type">{{ statusMeta(form.status).label }}</el-tag>
              <el-tag size="small" :type="riskMeta(current?.metrics?.churnRisk).type">
                流失风险 {{ riskMeta(current?.metrics?.churnRisk).label }}
              </el-tag>
            </div>
            <div class="dh-sub" v-if="current?.company">
              {{ countryText }} · {{ current.company.city || '—' }} · {{ custTypeLabel(current.company.custType) }} · {{ current.company.industry || '—' }}
            </div>
          </div>
          <div class="dh-right">更新于 {{ fmtTs(form.updatedAt) || '—' }}</div>
        </div>
      </template>

      <!-- 客户摘要指标 -->
      <div class="cust-hero">
        <div class="ch-item">
          <div class="ch-val">{{ money(hero.total) }}</div><div class="ch-lab">累计成交</div>
        </div>
        <div class="ch-item">
          <div class="ch-val">{{ hero.orders }} 次</div><div class="ch-lab">复购次数</div>
        </div>
        <div class="ch-item">
          <div class="ch-val" :class="{ warn: hero.lastContactWarn }">
            {{ hero.lastContactDays === null ? '—' : `${hero.lastContactDays} 天` }}
          </div><div class="ch-lab">距上次联系</div>
        </div>
        <div class="ch-item">
          <div class="ch-val" :class="hero.followCls">{{ hero.followText }}</div><div class="ch-lab">下次跟进</div>
        </div>
        <div class="ch-item">
          <div class="ch-val">{{ hero.credit ? `${hero.credit} 天` : '款到发货' }}</div><div class="ch-lab">账期</div>
        </div>
        <div class="ch-item">
          <div class="ch-val sm">{{ hero.payShort }}</div><div class="ch-lab">结算方式</div>
        </div>
      </div>

      <!-- 维护预警 -->
      <el-alert v-if="alerts.length" type="warning" :closable="false" show-icon class="hero-alert">
        <template #title>
          <div class="alert-list"><span v-for="a in alerts" :key="a" class="alert-item">{{ a }}</span></div>
        </template>
      </el-alert>

      <el-tabs v-model="tab" class="maint-tabs">
        <!-- 一、决策链 -->
        <el-tab-pane name="chain">
          <template #label><span class="tab-label"><el-icon><User /></el-icon>决策链</span></template>
          <div class="grp-title">客户与沟通</div>
          <el-form label-width="110px">
            <el-row :gutter="16">
              <el-col :span="12">
                <el-form-item label="时区">
                  <el-select v-model="form.timezone" filterable allow-create clearable style="width:100%">
                    <el-option v-for="t in timezoneOptions" :key="t" :label="t" :value="t" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="沟通语言">
                  <el-select v-model="form.language" filterable allow-create clearable style="width:100%">
                    <el-option v-for="lg in languageOptions" :key="lg" :label="lg" :value="lg" />
                  </el-select>
                </el-form-item>
              </el-col>
            </el-row>
            <el-form-item label="决策流程"><el-input v-model="form.decisionProcess" type="textarea" :rows="2" placeholder="如：老板拍板，采购执行下单" /></el-form-item>
            <el-row :gutter="16">
              <el-col :span="12"><el-form-item label="最佳联系时段"><el-input v-model="form.bestContactTime" placeholder="如 美东时间 9:00-11:00" /></el-form-item></el-col>
              <el-col :span="12">
                <el-form-item label="沟通偏好">
                  <el-select v-model="form.communicationPref" filterable allow-create clearable style="width:100%">
                    <el-option v-for="c in communicationPrefOptions" :key="c" :label="c" :value="c" />
                  </el-select>
                </el-form-item>
              </el-col>
            </el-row>
          </el-form>

          <div class="grp-title">
            关键联系人
            <span class="grp-hint">建议同时维护决策者 + 采购执行 + 备用联系人，避免单点失联</span>
          </div>
          <div v-for="(c, i) in form.keyContacts" :key="i" class="contact-card">
            <div class="cc-head">
              <el-input v-model="c.name" placeholder="姓名" class="cc-name" />
              <el-select v-model="c.role" placeholder="角色" class="cc-role">
                <el-option v-for="r in contactRoles" :key="r" :label="r" :value="r" />
              </el-select>
              <el-input v-model="c.title" placeholder="职位" class="cc-title" />
              <el-switch v-model="c.isKey" active-text="关键人" class="cc-key" />
              <el-button type="danger" text :icon="Delete" @click="form.keyContacts.splice(i, 1)" />
            </div>
            <div class="cc-row">
              <el-input v-model="c.email" placeholder="邮箱">
                <template #prefix><el-icon><Message /></el-icon></template>
              </el-input>
              <el-input v-model="c.phone" placeholder="电话">
                <template #prefix><el-icon><Phone /></el-icon></template>
              </el-input>
              <el-input v-model="c.whatsapp" placeholder="WhatsApp">
                <template #prefix><el-icon><ChatDotRound /></el-icon></template>
              </el-input>
            </div>
            <div class="cc-row">
              <el-input v-model="c.wechat" placeholder="微信" />
              <el-date-picker v-model="c.birthday" type="date" value-format="YYYY-MM-DD" placeholder="生日（可做节日关怀）" style="width:100%" />
            </div>
          </div>
          <el-button size="small" :icon="Plus" @click="addContact">添加联系人</el-button>
        </el-tab-pane>

        <!-- 二、交易与产品 -->
        <el-tab-pane name="trade">
          <template #label><span class="tab-label"><el-icon><Goods /></el-icon>交易与产品</span></template>
          <div class="grp-title">产品与价格</div>
          <el-form label-width="130px">
            <el-form-item label="客户主营品类"><el-input v-model="form.mainProducts" /></el-form-item>
            <el-form-item label="在售我方 SKU"><el-input v-model="form.ourSkus" placeholder="如 N2O 气弹 8g（50/100 支装）" /></el-form-item>
            <el-row :gutter="16">
              <el-col :span="12">
                <el-form-item label="客户等级价">
                  <el-select v-model="form.priceLevel" filterable allow-create clearable style="width:100%">
                    <el-option v-for="p in priceLevelOptions" :key="p" :label="p" :value="p" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="12"><el-form-item label="目标价"><el-input v-model="form.targetPrice" /></el-form-item></el-col>
              <el-col :span="12"><el-form-item label="上次成交价"><el-input v-model="form.lastPrice" /></el-form-item></el-col>
            </el-row>
            <el-row :gutter="16">
              <el-col :span="12"><el-form-item label="MOQ / 起订量"><el-input v-model="form.moq" placeholder="如 50,000 支（约 1×20GP）" /></el-form-item></el-col>
              <el-col :span="12">
                <el-form-item label="年采购量">
                  <el-select v-model="form.annualVolume" filterable allow-create clearable style="width:100%">
                    <el-option v-for="v in annualVolumeOptions" :key="v" :label="v" :value="v" />
                  </el-select>
                </el-form-item>
              </el-col>
            </el-row>
            <div class="grp-title">采购与成交</div>
            <el-row :gutter="16">
              <el-col :span="12">
                <el-form-item label="年采购额">
                  <el-input v-model="form.annualAmount" type="number">
                    <template #append>{{ form.currency }}</template>
                  </el-input>
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="采购周期">
                  <el-select v-model="form.purchaseCycle" filterable allow-create clearable style="width:100%">
                    <el-option v-for="cy in purchaseCycleOptions" :key="cy" :label="cy" :value="cy" />
                  </el-select>
                </el-form-item>
              </el-col>
            </el-row>
            <el-form-item label="淡旺季">
              <el-select v-model="form.peakSeason" filterable allow-create clearable style="width:100%">
                <el-option v-for="s in peakSeasonOptions" :key="s" :label="s" :value="s" />
              </el-select>
            </el-form-item>
            <el-row :gutter="16">
              <el-col :span="12">
                <el-form-item label="上次成交日">
                  <el-date-picker v-model="form.lastOrderDate" type="date" value-format="YYYY-MM-DD" style="width:100%" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="上次成交金额">
                  <el-input v-model="form.lastOrderAmount" type="number">
                    <template #append>{{ form.currency }}</template>
                  </el-input>
                </el-form-item>
              </el-col>
              <el-col :span="12"><el-form-item label="复购次数"><el-input v-model="form.orderCount" type="number" /></el-form-item></el-col>
            </el-row>
            <el-row :gutter="16">
              <el-col :span="12">
                <el-form-item label="累计成交额">
                  <el-input v-model="form.totalOrderAmount" type="number">
                    <template #append>{{ form.currency }}</template>
                  </el-input>
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="预计下次复购">
                  <el-date-picker v-model="form.nextReorderDate" type="date" value-format="YYYY-MM-DD" style="width:100%" />
                </el-form-item>
              </el-col>
            </el-row>
            <div class="grp-title">OEM 与包装</div>
            <el-form-item label="OEM / 贴牌"><el-input v-model="form.oem" placeholder="如 激光 logo、定制彩盒" /></el-form-item>
            <el-form-item label="包装标签要求"><el-input v-model="form.packagingReq" type="textarea" :rows="2" /></el-form-item>
          </el-form>
        </el-tab-pane>

        <!-- 三、商务与信用 -->
        <el-tab-pane name="terms">
          <template #label><span class="tab-label"><el-icon><CreditCard /></el-icon>商务与信用</span></template>
          <div class="grp-title">结算与信用</div>
          <el-form label-width="130px">
            <el-row :gutter="16">
              <el-col :span="12">
                <el-form-item label="结算方式">
                  <el-select v-model="form.paymentTerm" filterable allow-create clearable style="width:100%">
                    <el-option v-for="p in paymentTerms" :key="p" :label="p" :value="p" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="币种">
                  <el-select v-model="form.currency" style="width:100%">
                    <el-option label="USD" value="USD" /><el-option label="EUR" value="EUR" /><el-option label="CNY" value="CNY" /><el-option label="GBP" value="GBP" />
                  </el-select>
                </el-form-item>
              </el-col>
            </el-row>
            <el-row :gutter="16">
              <el-col :span="12">
                <el-form-item label="账期天数">
                  <el-input v-model="form.creditDays" type="number">
                    <template #append>天</template>
                  </el-input>
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="信用额度">
                  <el-input v-model="form.creditLimit" type="number">
                    <template #append>{{ form.currency }}</template>
                  </el-input>
                </el-form-item>
              </el-col>
            </el-row>
            <el-row :gutter="16">
              <el-col :span="12">
                <el-form-item label="贸易术语">
                  <el-select v-model="form.incoterm" filterable allow-create clearable style="width:100%">
                    <el-option v-for="t in incoterms" :key="t" :label="t" :value="t" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="付款履约">
                  <el-select v-model="form.settlementScore" style="width:100%">
                    <el-option label="准时（good）" value="good" />
                    <el-option label="偶有拖延（normal）" value="normal" />
                    <el-option label="经常逾期（poor）" value="poor" />
                  </el-select>
                </el-form-item>
              </el-col>
            </el-row>
            <el-row :gutter="16">
              <el-col :span="12">
                <el-form-item label="逾期金额">
                  <el-input v-model="form.overdueAmount" type="number">
                    <template #append>{{ form.currency }}</template>
                  </el-input>
                </el-form-item>
              </el-col>
              <el-col :span="12"><el-form-item label="逾期次数"><el-input v-model="form.overdueCount" type="number" /></el-form-item></el-col>
            </el-row>
            <div class="grp-title">价格与协议</div>
            <el-form-item label="折扣政策"><el-input v-model="form.discountPolicy" placeholder="如 单笔 ≥2 柜享 2%" /></el-form-item>
            <el-form-item label="返利政策"><el-input v-model="form.rebatePolicy" placeholder="如 年度 ≥8 柜返 1%" /></el-form-item>
            <el-row :gutter="16">
              <el-col :span="12"><el-form-item label="年框协议号"><el-input v-model="form.agreementNo" /></el-form-item></el-col>
              <el-col :span="12">
                <el-form-item label="协议到期日">
                  <el-date-picker v-model="form.agreementExpiry" type="date" value-format="YYYY-MM-DD" style="width:100%" />
                </el-form-item>
              </el-col>
            </el-row>
            <el-form-item label="报价有效期"><el-input v-model="form.priceValidity" placeholder="如 报价 30 天有效，原料涨价超 5% 可重议" /></el-form-item>
          </el-form>
        </el-tab-pane>

        <!-- 四、物流与单证 -->
        <el-tab-pane name="logistics">
          <template #label><span class="tab-label"><el-icon><Van /></el-icon>物流与单证</span></template>
          <div class="grp-title">运输与清关</div>
          <el-form label-width="130px">
            <el-row :gutter="16">
              <el-col :span="12"><el-form-item label="目的港 / 机场"><el-input v-model="form.destinationPort" placeholder="如 Philadelphia, PA" /></el-form-item></el-col>
              <el-col :span="12"><el-form-item label="指定货代"><el-input v-model="form.forwarder" /></el-form-item></el-col>
            </el-row>
            <el-form-item label="清关行"><el-input v-model="form.customsBroker" /></el-form-item>
            <div class="grp-title">单证与包装</div>
            <el-form-item label="所需单证">
              <el-select v-model="form.requiredDocs" multiple filterable allow-create default-first-option style="width:100%">
                <el-option v-for="d in docOptions" :key="d" :label="d" :value="d" />
              </el-select>
            </el-form-item>
            <el-row :gutter="16">
              <el-col :span="12">
                <el-form-item label="交货周期">
                  <el-input v-model="form.leadTimeDays" type="number">
                    <template #append>天</template>
                  </el-input>
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="包装方式">
                  <el-select v-model="form.packagingMethod" filterable allow-create clearable style="width:100%">
                    <el-option v-for="pk in packagingOptions" :key="pk" :label="pk" :value="pk" />
                  </el-select>
                </el-form-item>
              </el-col>
            </el-row>
            <el-form-item label="唛头要求"><el-input v-model="form.shippingMark" placeholder="如 BAKERY SUPPLY / PO# / C/NO." /></el-form-item>
            <el-form-item label="特殊要求"><el-input v-model="form.specialReq" type="textarea" :rows="2" placeholder="如 危险品 UN1070，需危包证与危险品舱位" /></el-form-item>
          </el-form>
        </el-tab-pane>

        <!-- 五、合规与资质 -->
        <el-tab-pane name="compliance">
          <template #label><span class="tab-label"><el-icon><Stamp /></el-icon>合规与资质</span></template>
          <div class="grp-title">公司资质</div>
          <el-form label-width="130px">
            <el-form-item label="税号 / EIN"><el-input v-model="form.taxId" /></el-form-item>
            <el-form-item label="VAT 号"><el-input v-model="form.vatNumber" /></el-form-item>
            <el-form-item label="EORI 号"><el-input v-model="form.eori" /></el-form-item>
            <el-form-item label="进口资质"><el-input v-model="form.importLicense" /></el-form-item>
          </el-form>
          <div class="grp-title">认证与证件<span class="grp-hint">到期前 60 天在看板自动预警</span></div>
          <div v-for="(c, i) in form.certifications" :key="i" class="cert-row">
            <el-select v-model="c.name" filterable allow-create clearable placeholder="认证名称" style="width:280px">
              <el-option v-for="ct in certOptions" :key="ct" :label="ct" :value="ct" />
            </el-select>
            <el-date-picker v-model="c.expiry" type="date" value-format="YYYY-MM-DD" placeholder="到期日" style="width:180px" />
            <el-tag v-if="c.expiry" size="small" :type="certState(c.expiry).type">{{ certState(c.expiry).text }}</el-tag>
            <el-button type="danger" text :icon="Delete" @click="form.certifications.splice(i, 1)" />
          </div>
          <el-button size="small" :icon="Plus" @click="addCert">添加认证</el-button>
        </el-tab-pane>

        <!-- 六、跟进与售后 -->
        <el-tab-pane name="follow">
          <template #label><span class="tab-label"><el-icon><ChatDotRound /></el-icon>跟进与售后</span></template>
          <div class="grp-title">跟进计划</div>
          <el-form label-width="130px">
            <el-row :gutter="16">
              <el-col :span="12">
                <el-form-item label="最近联系日">
                  <el-date-picker v-model="form.lastContactDate" type="date" value-format="YYYY-MM-DD" style="width:100%" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="下次跟进日">
                  <el-date-picker v-model="form.nextFollowUpDate" type="date" value-format="YYYY-MM-DD" style="width:100%" />
                </el-form-item>
              </el-col>
            </el-row>
            <el-row :gutter="16">
              <el-col :span="12">
                <el-form-item label="跟进方式">
                  <el-select v-model="form.followUpChannel" filterable allow-create clearable style="width:100%">
                    <el-option v-for="c in followChannels" :key="c" :label="c" :value="c" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="维护状态">
                  <el-select v-model="form.status" style="width:100%">
                    <el-option v-for="s in statusOptions" :key="s.value" :label="s.label" :value="s.value" />
                  </el-select>
                </el-form-item>
              </el-col>
            </el-row>
            <el-form-item label="跟进要点"><el-input v-model="form.followUpNote" type="textarea" :rows="2" /></el-form-item>
            <div class="grp-title">满意度与风险</div>
            <el-row :gutter="16">
              <el-col :span="12"><el-form-item label="满意度"><el-rate v-model="form.satisfaction" :max="5" /></el-form-item></el-col>
              <el-col :span="12"><el-form-item label="投诉次数"><el-input v-model="form.complaintCount" type="number" /></el-form-item></el-col>
              <el-col :span="12">
                <el-form-item label="风险等级">
                  <el-select v-model="form.riskLevel" style="width:100%">
                    <el-option label="低" value="低" /><el-option label="中" value="中" /><el-option label="高" value="高" />
                  </el-select>
                </el-form-item>
              </el-col>
            </el-row>
            <el-form-item label="售后记录"><el-input v-model="form.afterSalesNote" type="textarea" :rows="2" placeholder="质量异议 / 索赔 / 处理结果" /></el-form-item>
            <el-form-item label="风险备注"><el-input v-model="form.riskNote" type="textarea" :rows="2" placeholder="国家风险 / 汇率 / 信用 / 竞争" /></el-form-item>
          </el-form>

          <div class="grp-title">
            维护动态
            <span class="grp-count">{{ logs.length }}</span>
            <span class="grp-hint">新增「复购」会自动累加累计成交额与复购次数</span>
          </div>
          <div class="log-form">
            <el-select v-model="logForm.type" style="width:120px">
              <el-option v-for="t in logTypes" :key="t.value" :label="t.label" :value="t.value" />
            </el-select>
            <el-input v-model="logForm.content" placeholder="记录内容，如 邮件确认 Q4 备货 2 柜" style="flex:1" />
            <el-input v-if="logForm.type === 'reorder'" v-model="logForm.amount" type="number" placeholder="成交金额" style="width:140px" />
            <el-date-picker v-model="logForm.nextDate" type="date" value-format="YYYY-MM-DD" placeholder="下次跟进日" style="width:170px" />
            <el-button type="primary" :loading="logSaving" @click="submitLog">添加</el-button>
          </div>

          <el-timeline v-if="logs.length" class="log-timeline">
            <el-timeline-item
              v-for="l in logs"
              :key="l.id"
              :timestamp="fmtTs(l.createdAt)"
              :type="logTypeMeta(l.type).type"
              placement="top"
            >
              <div class="log-item">
                <el-tag size="small" :type="logTypeMeta(l.type).type">{{ logTypeMeta(l.type).label }}</el-tag>
                <span class="log-content">{{ l.content }}</span>
                <span v-if="l.amount" class="log-amount">{{ money(l.amount) }}</span>
                <el-button size="small" text type="danger" :icon="Delete" @click="removeLog(l)" />
              </div>
              <div v-if="l.nextDate" class="log-next">下次跟进：{{ l.nextDate }}</div>
            </el-timeline-item>
          </el-timeline>
          <el-empty v-else description="暂无维护动态" :image-size="60" />

          <div class="grp-title">
            客户历史轨迹
            <span class="grp-count ghost">{{ hist.length }}</span>
            <span class="grp-hint">系统自动汇总：邮件往来 / 跟进活动 / 商机 / 询盘（只读）</span>
          </div>
          <el-timeline v-if="hist.length" class="log-timeline">
            <el-timeline-item
              v-for="h in hist"
              :key="`${h.source}_${h.id}`"
              :timestamp="fmtTs(h.at)"
              :type="historyMeta(h.source).type"
              placement="top"
            >
              <div class="log-item">
                <el-tag size="small" :type="historyMeta(h.source).type" class="hist-tag">
                  <el-icon class="hist-ic"><component :is="historyIcon(h.source)" /></el-icon>
                  {{ historyMeta(h.source).label }}
                </el-tag>
                <el-tag v-if="h.status" size="small" type="info" effect="plain">{{ statusText(h.status) }}</el-tag>
                <span class="log-content">{{ h.title }}</span>
                <span v-if="h.amount" class="log-amount">{{ money(h.amount) }}</span>
              </div>
              <div v-if="h.desc" class="log-next">{{ h.desc }}</div>
              <div v-if="h.by" class="log-next">来源 / 操作人：{{ h.by }}</div>
            </el-timeline-item>
          </el-timeline>
          <el-empty v-else description="暂无邮件、跟进、商机等系统历史记录" :image-size="60" />
        </el-tab-pane>
      </el-tabs>

      <template #footer>
        <el-button @click="drawer = false">关闭</el-button>
        <el-button type="primary" :loading="saving" @click="saveProfile">保存档案</el-button>
      </template>
    </el-drawer>

    <!-- 新增客户 -->
    <el-dialog v-model="addVisible" title="新增客户" width="480px" align-center>
      <el-form :model="addForm" label-width="90px">
        <el-form-item label="公司名称" required>
          <el-input v-model="addForm.name" placeholder="如 BakerySupply Inc." />
        </el-form-item>
        <el-form-item label="国家">
          <el-input v-model="addForm.country" placeholder="如 US" />
        </el-form-item>
        <el-form-item label="城市">
          <el-input v-model="addForm.city" placeholder="如 Philadelphia" />
        </el-form-item>
        <el-form-item label="客户来源">
          <el-select v-model="addForm.source" filterable allow-create clearable style="width:100%" placeholder="选择获客渠道">
            <el-option-group v-for="g in dict.acquireChannel" :key="g.group" :label="g.group">
              <el-option v-for="s in g.items" :key="s.value" :label="s.label" :value="s.value" />
            </el-option-group>
          </el-select>
        </el-form-item>
        <el-form-item label="客户类型">
          <el-select v-model="addForm.custType" filterable allow-create clearable style="width:100%">
            <el-option v-for="t in dict.custType" :key="t.value" :label="t.label" :value="t.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="行业">
          <el-input v-model="addForm.industry" placeholder="如 烘焙原料批发" />
        </el-form-item>
        <el-form-item label="客户等级">
          <el-select v-model="addForm.level" style="width:100%">
            <el-option label="A 级" value="A" />
            <el-option label="B 级" value="B" />
            <el-option label="C 级" value="C" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="addVisible = false">取消</el-button>
        <el-button type="primary" :loading="addSaving" @click="submitAdd">创建</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Service, Tickets, Refresh, Plus, Delete, User, Goods, CreditCard, Van, Stamp, ChatDotRound, Message, Phone, Promotion, Trophy, QuestionFilled } from '@element-plus/icons-vue';
import api, { dict } from '../api';

const ov = ref<any>({});
const rows = ref<any[]>([]);
const loading = ref(false);
const filters = reactive({ keyword: '', status: '', risk: '' });

const drawer = ref(false);
const tab = ref('chain');
const current = ref<any>(null);
const form = ref<any>({});
const logs = ref<any[]>([]);
const hist = ref<any[]>([]);
const saving = ref(false);
const logSaving = ref(false);
const logForm = reactive({ type: 'follow', content: '', amount: 0, nextDate: '' });

const statusOptions = [
  { label: '活跃', value: 'active' },
  { label: '需关注', value: 'watch' },
  { label: '沉睡', value: 'dormant' },
  { label: '流失', value: 'churned' },
];
const contactRoles = ['决策者', '影响者', '使用者', '采购执行', '财务'];
const paymentTerms = [
  'T/T 30% 定金 + 70% 见提单副本',
  'T/T 100% 发货前',
  'T/T 50% 定金 + 50% 发货前',
  'L/C at sight',
  'L/C 30 天',
  'L/C 60 天',
  'D/P',
  'D/A',
  'OA 30 天',
  'OA 60 天',
  'OA 90 天',
];
const incoterms = ['EXW', 'FOB', 'CFR', 'CIF', 'DAP', 'DDP'];
const docOptions = ['商业发票', '装箱单', '提单', 'CO 原产地证', 'FORM E', 'MSDS', '危险品包装证明', '质检报告', '保险单', '品牌授权书'];
const followChannels = ['邮件', '电话', 'WhatsApp', '微信', '视频会议', '拜访', '展会'];
const logTypes = [
  { label: '跟进', value: 'follow' },
  { label: '复购', value: 'reorder' },
  { label: '寄样', value: 'sample' },
  { label: '售后', value: 'aftersale' },
  { label: '投诉', value: 'complaint' },
  { label: '拜访', value: 'visit' },
];

/** 可枚举的固定选项：下拉选择为主，同时允许手动输入自定义值 */
const timezoneOptions = [
  'America/New_York（美东 UTC-5）',
  'America/Chicago（美中 UTC-6）',
  'America/Los_Angeles（美西 UTC-8）',
  'Europe/London（英国 UTC+0）',
  'Europe/Berlin（德国 UTC+1）',
  'Europe/Madrid（西班牙 UTC+1）',
  'Europe/Moscow（俄罗斯 UTC+3）',
  'Asia/Dubai（迪拜 UTC+4）',
  'Asia/Singapore（新加坡 UTC+8）',
  'Asia/Tokyo（日本 UTC+9）',
  'Australia/Sydney（澳洲 UTC+10）',
];
const languageOptions = ['English', 'Deutsch', 'Français', 'Español', 'Português', 'Italiano', 'Nederlands', 'Русский', 'العربية', '日本語', '中文'];
const communicationPrefOptions = ['邮件为主', '电话为主', 'WhatsApp 为主', '微信为主', '邮件 + 电话', '视频会议为主'];
const priceLevelOptions = ['A 级客户价', 'B 级客户价', 'C 级客户价', 'OEM 项目价', '经销/代理价', '样品价'];
const purchaseCycleOptions = ['月度', '季度', '半年', '年度', '不定期', '项目制（按新品上市）'];
const annualVolumeOptions = ['1-3 柜/年', '4-7 柜/年', '8-10 柜/年', '10 柜以上/年', '1-2 万支/年', '待评估'];
const certOptions = ['FDA 食品接触注册', 'CE 认证', 'ISO 9001', 'HACCP', 'LFGB', 'BRC', 'MSDS（随货）', '危险品包装证明', 'FORM E'];
const peakSeasonOptions = ['Q4 圣诞/烘焙旺季', '夏季冷饮旺季', '春季备货', '秋季备货', '无明显淡旺季'];
const packagingOptions = ['彩盒 + 外箱', '简装 PE 袋 + 外箱', '散装 + 托盘', '定制礼盒', '中性包装'];

const money = (v: any) => {
  const n = Number(v || 0);
  return n >= 10000 ? `${(n / 10000).toFixed(1)} 万` : n.toLocaleString();
};
const gradeType = (g: string) => ({ A: 'success', B: 'warning', C: 'info' } as any)[g] || 'info';
const custTypeLabel = (v: string) => (dict.custType.find((t) => t.value === v)?.label as string) || v || '—';
const sourceLabel = (v: string) => {
  for (const g of dict.acquireChannel) {
    const f = g.items.find((t) => t.value === v);
    if (f) return f.label as string;
  }
  return v || '—';
};
const statusMeta = (s: string) =>
  ({ active: { label: '活跃', type: 'success' }, watch: { label: '需关注', type: 'warning' }, dormant: { label: '沉睡', type: 'info' }, churned: { label: '流失', type: 'danger' } } as any)[s] || { label: '活跃', type: 'success' };
const riskMeta = (r: string) =>
  ({ high: { label: '高', type: 'danger' }, medium: { label: '中', type: 'warning' }, low: { label: '低', type: 'success' }, unknown: { label: '待评估', type: 'info' } } as any)[r] || { label: r || '—', type: 'info' };
const logTypeMeta = (t: string) =>
  ({ follow: { label: '跟进', type: 'primary' }, reorder: { label: '复购', type: 'success' }, sample: { label: '寄样', type: 'warning' }, aftersale: { label: '售后', type: 'info' }, complaint: { label: '投诉', type: 'danger' }, visit: { label: '拜访', type: 'primary' } } as any)[t] || { label: t, type: 'info' };

/** 系统历史类型：邮件 / 回复 / 跟进 / 商机 / 询盘 */
const historyMeta = (s: string) =>
  ({ mail: { label: '邮件发送', type: 'primary' }, reply: { label: '客户回复', type: 'success' }, activity: { label: '跟进活动', type: 'info' }, opportunity: { label: '商机', type: 'warning' }, inquiry: { label: '询盘', type: 'danger' } } as any)[s] || { label: s, type: 'info' };

/** 历史来源对应图标 */
const historyIcon = (s: string) =>
  ({ mail: Message, reply: ChatDotRound, activity: Promotion, opportunity: Trophy, inquiry: QuestionFilled } as any)[s] || Promotion;

/** 历史记录中的状态/阶段英文值转中文 */
const statusText = (s: string) =>
  ({
    sent: '已发送', opened: '已打开', replied: '已回复', failed: '发送失败',
    inquiry: '询盘', sample: '寄样', quote: '报价', negotiation: '谈判', won: '成交', lost: '流失',
    pending: '待处理', processing: '处理中', closed: '已关闭',
    email: '邮件', note: '备注', call: '电话', meeting: '会议',
  } as any)[s] || s || '';

/** ISO 时间戳转本地时间 YYYY-MM-DD HH:mm（系统历史记录按本地时区展示） */
const fmtTs = (ts?: string) => {
  if (!ts) return '';
  const d = new Date(String(ts));
  if (Number.isNaN(d.getTime())) return String(ts).slice(0, 16);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
};

/** 距指定日期天数：正数 = 已过去，负数 = 还有 N 天到 */
const daysUntil = (d?: string | null): number | null => {
  if (!d) return null;
  const t = new Date(`${String(d).slice(0, 10)}T00:00:00`).getTime();
  if (Number.isNaN(t)) return null;
  return Math.floor((Date.now() - t) / 86400000);
};

/** 客户所属国家（头部副标题展示） */
const countryText = computed(() => current.value?.company?.country || '—');

/** 抽屉顶部客户摘要：跟随表单实时更新 */
const hero = computed(() => {
  const p = form.value || {};
  const due = daysUntil(p.nextFollowUpDate);
  const lastContact = current.value?.metrics?.lastContactDays ?? null;
  return {
    total: Number(p.totalOrderAmount || 0),
    orders: Number(p.orderCount || 0),
    lastContactDays: lastContact,
    lastContactWarn: (lastContact ?? 0) > 45,
    followText: due === null ? '未设置' : due > 0 ? `逾期 ${due} 天` : due === 0 ? '今日跟进' : `${-due} 天后`,
    followCls: due === null ? '' : due > 0 ? 'danger' : due === 0 ? 'warn' : '',
    credit: Number(p.creditDays || 0),
    payShort: String(p.paymentTerm || '').split('+')[0].trim() || '—',
  };
});

/** 维护预警：把需要立刻处理的事顶到最前面 */
const alerts = computed(() => {
  const p = form.value || {};
  const m = current.value?.metrics || {};
  const list: string[] = [];
  if (m.followOverdueDays > 0) list.push(`跟进已逾期 ${m.followOverdueDays} 天`);
  else if (m.followDueDays === 0) list.push('今日需跟进');
  if (m.churnRisk === 'high') list.push('高流失风险，建议立即触达');
  const agreeLeft = m.agreementLeftDays;
  if (typeof agreeLeft === 'number' && agreeLeft >= 0 && agreeLeft <= 30) list.push(`年框协议 ${agreeLeft} 天后到期`);
  if (m.certExpiringCount > 0) list.push(`${m.certExpiringCount} 项认证 60 天内到期`);
  if (Number(p.overdueAmount || 0) > 0) list.push(`存在逾期应收 ${money(p.overdueAmount)}`);
  if (p.settlementScore === 'poor') list.push('付款履约差（经常逾期）');
  if (Number(p.complaintCount || 0) > 0) list.push(`累计投诉 ${p.complaintCount} 次`);
  return list;
});

/** 认证到期状态：已过期 / 临期 / 有效 */
const certState = (expiry?: string) => {
  const raw = daysUntil(expiry);
  if (raw === null) return { text: '未设置', type: 'info' as const };
  const left = -raw;
  if (left < 0) return { text: '已过期', type: 'danger' as const };
  if (left <= 60) return { text: `${left} 天后到期`, type: 'warning' as const };
  return { text: '有效', type: 'success' as const };
};

/** 跟进状态：逾期红 / 今日橙 / 未来灰 */
const followCell = (row: any) => {
  if (row.followOverdueDays > 0) return { text: `逾期 ${row.followOverdueDays} 天`, cls: 'overdue' };
  if (row.followDueDays === 0) return { text: '今日跟进', cls: 'today' };
  if (row.followDueDays !== null && row.followDueDays > 0) return { text: `${row.followDueDays} 天后`, cls: 'future' };
  return { text: '—', cls: '' };
};

const loadOverview = async () => {
  try {
    ov.value = await api.maintenance.overview();
  } catch { /* 拦截器已提示 */ }
};
const total = ref(0);
const page = ref(1);
const size = ref(20);
const sortBy = ref('createdAt');
const order = ref('descending');
const loadRows = async () => {
  loading.value = true;
  try {
    const res = await api.maintenance.profiles({
      ...filters,
      sortBy: sortBy.value,
      order: order.value,
      page: page.value,
      size: size.value,
    });
    rows.value = res.rows || [];
    total.value = res.total || 0;
  } finally {
    loading.value = false;
  }
};
const onSortChange = (e: { prop: string; order: string | null }) => {
  if (!e.prop || !e.order) {
    sortBy.value = 'createdAt';
    order.value = 'descending';
  } else {
    sortBy.value = e.prop;
    order.value = e.order;
  }
  page.value = 1;
  loadRows();
};
const onPageChange = (p: number) => { page.value = p; loadRows(); };
const onSizeChange = (s: number) => { size.value = s; page.value = 1; loadRows(); };
const onFilter = () => { page.value = 1; loadRows(); };

const openDetail = async (row: any) => {
  const d = await api.maintenance.detail(row.companyId);
  if (!d) return ElMessage.warning('客户不存在');
  current.value = d;
  form.value = JSON.parse(JSON.stringify(d.profile));
  form.value.keyContacts = d.profile.keyContacts || [];
  form.value.certifications = d.profile.certifications || [];
  form.value.requiredDocs = d.profile.requiredDocs || [];
  logs.value = d.logs || [];
  hist.value = d.history || [];
  tab.value = 'chain';
  drawer.value = true;
};

const addVisible = ref(false);
const addSaving = ref(false);
const addForm = reactive({ name: '', country: '', city: '', source: '', custType: '', industry: '', level: 'B' });
const openAdd = () => {
  Object.assign(addForm, { name: '', country: '', city: '', source: '', custType: '', industry: '', level: 'B' });
  addVisible.value = true;
};
const submitAdd = async () => {
  if (!addForm.name.trim()) return ElMessage.warning('请填写公司名称');
  addSaving.value = true;
  try {
    await api.companies.create({ ...addForm });
    addVisible.value = false;
    ElMessage.success('客户已创建，可在台账中维护');
    await loadRows();
    await loadOverview();
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message || e?.message || '创建失败');
  } finally {
    addSaving.value = false;
  }
};

const addContact = () => {
  if (!form.value.keyContacts) form.value.keyContacts = [];
  form.value.keyContacts.push({ name: '', role: '决策者', title: '', email: '', phone: '', whatsapp: '', wechat: '', birthday: '', isKey: false });
};
const addCert = () => {
  if (!form.value.certifications) form.value.certifications = [];
  form.value.certifications.push({ name: '', expiry: '' });
};

/** 数值字段：el-input type=number 会提交字符串，统一归一化后再落库 */
const NUM_FIELDS = ['annualAmount', 'lastOrderAmount', 'orderCount', 'totalOrderAmount', 'creditDays', 'creditLimit', 'leadTimeDays', 'overdueAmount', 'overdueCount', 'complaintCount'];
/** 后端自动回写的字段：新增 / 删除动态后需与服务端同步，避免保存时把统计回退 */
const AUTO_SYNC_FIELDS = ['lastContactDate', 'nextFollowUpDate', 'lastOrderDate', 'lastOrderAmount', 'totalOrderAmount', 'orderCount', 'complaintCount'];

const saveProfile = async () => {
  saving.value = true;
  try {
    const payload: any = { ...form.value };
    NUM_FIELDS.forEach((k) => { payload[k] = Number(payload[k] || 0); });
    await api.maintenance.save(current.value.company.id, payload);
    ElMessage.success('维护档案已保存');
    await loadRows();
    await loadOverview();
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message || e?.message || '保存失败');
  } finally {
    saving.value = false;
  }
};

const submitLog = async () => {
  if (!logForm.content.trim()) return ElMessage.warning('请填写记录内容');
  logSaving.value = true;
  try {
    await api.maintenance.addLog({ companyId: current.value.company.id, ...logForm, amount: Number(logForm.amount || 0) });
    logForm.content = '';
    logForm.amount = 0;
    logForm.nextDate = '';
    const d = await api.maintenance.detail(current.value.company.id);
    logs.value = d.logs || [];
    hist.value = d.history || [];
    // 仅同步后端自动回写的字段，保留用户尚未保存的其他编辑
    AUTO_SYNC_FIELDS.forEach((k) => { form.value[k] = d.profile[k]; });
    ElMessage.success('已添加维护动态');
    await loadRows();
    await loadOverview();
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message || e?.message || '添加失败');
  } finally {
    logSaving.value = false;
  }
};

const removeLog = async (l: any) => {
  try {
    await ElMessageBox.confirm('确认删除？删除「复购」会同步回退累计成交额与复购次数。', '删除', { type: 'warning' });
  } catch { return; }
  await api.maintenance.removeLog(l.id);
  const d = await api.maintenance.detail(current.value.company.id);
  logs.value = d.logs || [];
  hist.value = d.history || [];
  AUTO_SYNC_FIELDS.forEach((k) => { form.value[k] = d.profile[k]; });
  await loadRows();
  await loadOverview();
  ElMessage.success('已删除，统计已同步回退');
};

onMounted(async () => {
  await loadOverview();
  await loadRows();
});
</script>

<style scoped>
.head-card { border-radius: 12px; }
.head { display: flex; justify-content: space-between; align-items: flex-start; gap: 20px; flex-wrap: wrap; }
.head-left { display: flex; gap: 14px; flex: 1; min-width: 320px; }
.title-badge {
  width: 44px; height: 44px; flex-shrink: 0; border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
  color: #fff; font-size: 22px;
  background: linear-gradient(135deg, #409eff, #00c6ff);
  box-shadow: 0 4px 12px rgba(64, 158, 255, .3);
}
.title { margin: 0; font-size: 20px; font-weight: 700; color: #1f2937; }
.sub { margin: 6px 0 0; font-size: 12.5px; color: #64748b; line-height: 1.7; }
.head-right { display: flex; gap: 26px; }
.stat { text-align: center; }
.stat .num { font-size: 22px; font-weight: 700; color: #1f2937; }
.stat .num.warning { color: #f56c6c; }
.stat .num.primary { color: #409eff; }
.stat .num.success { color: #67c23a; }
.stat .lab { font-size: 12px; color: #94a3b8; margin-top: 2px; }
.ov-row { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 16px; padding-top: 14px; border-top: 1px solid #f1f5f9; }
.panel { border-radius: 12px; }
.panel-head { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; font-weight: 600; color: #1f2937; }
.filters { display: flex; gap: 8px; flex-wrap: wrap; }
.maint-table { cursor: pointer; }
.cust-name { font-weight: 600; color: #1f2937; }
.cust-sub { font-size: 12px; color: #94a3b8; margin-top: 2px; }
.follow.overdue { color: #f56c6c; font-weight: 600; }
.follow.today { color: #e6a23c; font-weight: 600; }
.follow.future { color: #909399; }
.dim { color: #c0c4cc; }
.ml { margin-left: 6px; }
.sec-title { font-size: 13px; font-weight: 700; color: #334155; margin: 16px 0 10px; }
.cert-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 8px; }

/* 抽屉头部：客户身份 + 状态 */
.drawer-head { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; padding-right: 24px; }
.dh-left { display: flex; flex-direction: column; align-items: flex-start; gap: 0; flex-wrap: wrap; }
.dh-top { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.dh-title { font-size: 17px; font-weight: 700; color: #1f2937; margin-right: 4px; }
.dh-sub { font-size: 12px; color: #94a3b8; margin-top: 5px; }
.dh-right { font-size: 12px; color: #94a3b8; }

/* 客户摘要指标 */
.cust-hero {
  display: grid; grid-template-columns: repeat(auto-fit, minmax(118px, 1fr)); gap: 10px;
  background: linear-gradient(135deg, #f8fbff 0%, #f5f7fa 100%);
  border: 1px solid #eef2f7; border-radius: 12px; padding: 14px 16px; margin-bottom: 14px;
}
.ch-item { text-align: center; border-right: 1px solid #e8edf5; padding: 0 6px; }
.ch-item:last-child { border-right: none; }
.ch-val { font-size: 17px; font-weight: 700; color: #1f2937; line-height: 1.3; }
.ch-val.sm { font-size: 13px; font-weight: 600; color: #475569; }
.ch-val.warn { color: #e6a23c; }
.ch-val.danger { color: #f56c6c; }
.ch-lab { font-size: 11.5px; color: #94a3b8; margin-top: 3px; }

/* 维护预警 */
.hero-alert { margin-bottom: 14px; }
.alert-list { display: flex; flex-wrap: wrap; gap: 6px 10px; }
.alert-item {
  display: inline-block; padding: 2px 8px; border-radius: 6px;
  background: #fdf6ec; border: 1px solid #faecd8; font-size: 12px; color: #b88230;
}

/* 分组标题 */
.grp-title {
  display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
  font-size: 13px; font-weight: 700; color: #334155;
  margin: 18px 0 12px; padding-left: 10px; position: relative;
}
.grp-title::before {
  content: ''; position: absolute; left: 0; top: 1px; bottom: 1px;
  width: 3px; border-radius: 2px; background: linear-gradient(180deg, #409eff, #00c6ff);
}
.grp-hint { font-size: 12px; font-weight: 400; color: #94a3b8; }
.grp-count { display: inline-flex; align-items: center; justify-content: center; min-width: 20px; height: 18px; padding: 0 7px; border-radius: 9px; background: #409eff; color: #fff; font-size: 11px; font-weight: 700; }
.grp-count.ghost { background: #eef2f7; color: #64748b; }
.tab-label { display: inline-flex; align-items: center; gap: 5px; }

/* 联系人卡片 */
.contact-card {
  border: 1px solid #eef2f7; border-radius: 10px; padding: 12px 14px;
  margin-bottom: 10px; background: #fcfdff; transition: border-color .2s, box-shadow .2s;
}
.contact-card:hover { border-color: #c6d9f5; box-shadow: 0 4px 12px rgba(64, 158, 255, .08); }
.cc-head { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.cc-name { width: 120px; }
.cc-role { width: 120px; }
.cc-title { width: 140px; }
.cc-key { margin-left: auto; }
.cc-row { display: flex; gap: 8px; margin-top: 8px; flex-wrap: wrap; }
.cc-row > * { flex: 1; min-width: 180px; }
.log-form { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; margin: 10px 0 18px; }
.log-timeline { padding-left: 4px; }
.log-item { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.hist-tag { display: inline-flex; align-items: center; gap: 3px; }
.hist-ic { font-size: 12px; }
.log-content { font-size: 13px; color: #334155; }
.log-amount { font-size: 13px; color: #67c23a; font-weight: 600; }
.log-next { font-size: 12px; color: #94a3b8; margin-top: 4px; }
</style>
