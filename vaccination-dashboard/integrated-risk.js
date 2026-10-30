/* Five-category adult clinical decision support; patient inputs stay in page memory. */
(() => {
  'use strict';
  const panel = document.querySelector('#integrated-clinic');
  const E = window.ClinicalEngine;
  if (!panel || !E) return;
  const detailed = document.createElement('details');
  detailed.className = 'ir-detail';
  detailed.innerHTML = '<summary>정확한 수치와 추가 정보로 상세 평가하기</summary><p class="ic-hint">간편 분류에 없는 나이·검사값·검사 확인·위험인자를 입력하면 기존 상세 계산을 사용할 수 있습니다.</p>';
  panel.querySelector('.ic-diseases').before(detailed);
  while (detailed.nextSibling) detailed.appendChild(detailed.nextSibling);
  const style = document.createElement('style');
  style.textContent = `.ir-intro{color:#164b59;margin:24px 0 8px}.ir-form{display:grid;gap:12px}.ir-group{border:1px solid #cfe1e4;background:#fff;border-radius:13px;padding:17px}.ir-group legend{font-size:17px;font-weight:750;color:#1b4b5c;padding:0 4px}.ir-group h4{font-size:14px;color:#376371;margin:14px 0 7px}.ir-choices{display:flex;flex-wrap:wrap;gap:8px}.ir-choices label{display:flex;gap:7px;align-items:center;padding:9px 11px;border:1px solid #d5e4e7;border-radius:9px;background:#f3f8f9;margin:0;line-height:1.5;font-size:14px;cursor:pointer}.ir-choices label:has(input:checked){background:#d7efeb;border-color:#298c87;color:#075b5d}.ir-detail{margin:22px 0;padding:17px;background:#f8fbfc;border:1px solid #cfe1e4;border-radius:13px}.ir-detail>summary{font-weight:750;color:#15556b;cursor:pointer}.ir-note{font-size:13px;color:#6d5631;background:#fff7e8;border-radius:8px;padding:12px;line-height:1.7}.ir-output{margin:25px 0}.ir-output:empty{display:none}.ir-card{background:#fff;border:1px solid #d3e4e9;border-top:4px solid #16828a;padding:19px;border-radius:12px;line-height:1.75}.ir-card.warn{border-top-color:#cc7f2e}.ir-card.danger{border-top-color:#bf3f3b}.ir-card h3{margin:0 0 10px;color:#174b5a}.ir-card h4{margin:14px 0 4px;color:#167680}.ir-card p,.ir-card li{font-size:14px;margin:5px 0}.ir-card ul{padding-left:20px}.ir-card details{margin-top:14px;border-top:1px solid #e4ecee;padding-top:10px}.ir-source{font-size:12px;color:#5c747b;line-height:1.8}.ir-form button{width:fit-content}`;
  document.head.appendChild(style);
  const labels = {
    htn:'고혈압 진단',dm:'당뇨병 진단',hld:'이상지질혈증 진단',osteoporosis:'골다공증 진단',cad:'관상동맥질환(심근경색·협심증)',atheroscleroticStroke:'죽상경화성 허혈뇌졸중·일과성 허혈발작',pad:'말초동맥질환',ckd:'만성콩팥병 진단',dmOrgan:'당뇨병 표적장기손상',hmod:'고혈압 관련 장기손상',
    smoking:'현재 흡연',obesity:'비만·복부비만',familyEarlyCvd:'조기 심혈관질환 가족력(남 <55세·여 <65세)',familyDm:'당뇨병 가족력',familyHtn:'고혈압 가족력',familyHld:'고지혈증 가족력',parentHip:'부모의 고관절 골절',inactive:'신체활동 부족',steroids:'장기 전신 스테로이드 사용',fallRisk:'낙상 고위험',age65:'65세 이상',pregnant:'현재 임신',
    bp_low:'진료실 혈압 140/90 미만',bp1:'140–159 또는 90–99',bp2:'160–179 또는 100–109',bp_urgent:'수축기 ≥180 또는 이완기 ≥110',a1c_low:'HbA1c 5.7% 미만',a1c_pre:'HbA1c 5.7–6.4%',a1c_high:'HbA1c ≥6.5%',bpRepeated:'혈압을 반복 측정해 확인',dmRepeat:'진단 범위 혈당검사를 반복해 확인',onBp:'혈압약 복용 중',onDm:'당뇨병 약 복용 중',acute:'현재 흉통·호흡곤란·마비·언어장애·의식저하',
    ldl_low:'LDL-C <70 mg/dL',ldl70:'LDL-C 70–99',ldl100:'LDL-C 100–129',ldl130:'LDL-C 130–159',ldl160:'LDL-C 160–189',ldl190:'LDL-C ≥190',hdl_low:'HDL-C <40 mg/dL',hdl_high:'HDL-C 60–100 mg/dL',onLipid:'지질강하제 복용 중',
    eligible:'폐경 후 여성 또는 50세 이상 남성',t_normal:'T-score ≥−1.0',t_low:'T-score −1.0 미만 ~ −2.5 초과',t_ost:'T-score ≤−2.5',fragility:'가벼운 충격으로 발생한 골절',hipSpineFracture:'고관절 또는 척추 취약골절',recentFracture:'최근 12개월 내 취약골절',multipleFracture:'다발성 취약골절',onBone:'골다공증 약물 복용 중',denosumab:'데노수맙 사용 중',missedDenosumab:'데노수맙 투여 지연·중단 예정'
  };
  const checks = keys => `<div class="ir-choices">${keys.map(k=>`<label><input type="checkbox" name="${k}"> ${labels[k]}</label>`).join('')}</div>`;
  const groups = [
    ['1 · 현재 질병 및 합병증', '진단받은 질환만 선택 · 중복 선택 가능', ['htn','dm','hld','osteoporosis','cad','atheroscleroticStroke','pad','ckd','dmOrgan','hmod']],
    ['2 · 공통 위험인자와 적용 대상', '해당되는 위험인자를 모두 선택합니다.', ['age65','smoking','obesity','familyEarlyCvd','familyDm','familyHtn','familyHld','parentHip','inactive','steroids','fallRisk','pregnant']],
    ['3 · 혈압과 혈당', '혈압 범위 중 하나와 HbA1c 범위 중 하나를 각각 선택하고, 해당되는 치료·확인 항목을 추가 선택합니다.', ['bp_low','bp1','bp2','bp_urgent','a1c_low','a1c_pre','a1c_high','bpRepeated','dmRepeat','onBp','onDm','acute']],
    ['4 · 지질검사와 치료', '최근 LDL 범위 중 하나, HDL 범위 중 하나와 치료 여부를 선택합니다.', ['ldl_low','ldl70','ldl100','ldl130','ldl160','ldl190','hdl_low','hdl_high','onLipid']],
    ['5 · 골밀도·골절과 치료', '골밀도 범위 중 하나 및 해당되는 골절·치료 항목을 모두 선택합니다.', ['eligible','t_normal','t_low','t_ost','fragility','hipSpineFracture','recentFracture','multipleFracture','onBone','denosumab','missedDenosumab']]
  ];
  const quick = document.createElement('section');
  quick.setAttribute('aria-label','5개 카테고리 위험인자 간편 평가');
  quick.innerHTML = `<h3 class="ir-intro">5개 카테고리 · 위험인자 통합 평가</h3><p class="ic-hint">각 카테고리에서 해당되는 항목을 모두 체크하세요. 체크하지 않은 항목은 ‘없음’이 아니라 <strong>미확인</strong>으로 처리합니다. 같은 검사 범위는 하나만 선택됩니다.</p><form class="ir-form" autocomplete="off">${groups.map(([title,help,keys])=>`<fieldset class="ir-group"><legend>${title}</legend><p class="ic-hint">${help}</p>${checks(keys)}</fieldset>`).join('')}<div class="ic-toolbar"><button type="submit" class="ic-primary">질환별 위험군·치료 방침 확인</button><button type="reset">선택 초기화</button></div></form><div class="ir-note">비임신 성인 진료 참고용입니다. 체크되지 않은 정보는 모름이며, 검사값은 범위만 사용합니다. 실제 나이·약제·임상 상태·검사 확인에 따라 분류와 목표가 달라집니다. 자동 진단·처방이 아니며 급성 증상은 일반 알고리즘보다 응급 평가가 우선입니다.</div><div class="ir-output" aria-live="polite"></div>`;
  detailed.before(quick);
  const form=quick.querySelector('form'), out=quick.querySelector('.ir-output');
  const has=k=>!!form.elements[k]?.checked;
  const pick=keys=>keys.find(has)||null;
  const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const bpKeys=['bp_low','bp1','bp2','bp_urgent'], sugarKeys=['a1c_low','a1c_pre','a1c_high'], ldlKeys=['ldl_low','ldl70','ldl100','ldl130','ldl160','ldl190'], hdlKeys=['hdl_low','hdl_high'], tKeys=['t_normal','t_low','t_ost'];
  const mutuallyExclusive=[bpKeys,sugarKeys,ldlKeys,hdlKeys,tKeys];
  function facts() {
    const p={}; for(const k of E.boolKeys) if(has(k))p[k]=true;
    if(has('age65')) p.age=65; // Threshold representative, not a claim about exact age.
    if(has('acute')) {p.acuteChestNeuro=true; p.acuteMetabolic=true;}
    if(has('hipSpineFracture')||has('recentFracture')||has('multipleFracture'))p.fragility=true;
    if(has('denosumab'))p.onBone=true;
    if(has('hdl_low'))p.hdl=39; // Representative only for <40 risk criterion.
    if(has('hdl_high'))p.hdl=60; // Representative only for 60–100 risk criterion.
    if(has('ldl160')||has('ldl190'))p.hld=true; // LDL ≥160 meets the BP lipid risk criterion.
    const bp=pick(bpKeys);
    // The existing matrix requires numbers. These fixed examples represent only the selected BP category;
    // they are never presented as measurements, and no dose/individualised decision is inferred from them.
    if(bp==='bp_low'){p.sbp=125;p.dbp=75;}
    if(bp==='bp1'){p.sbp=150;p.dbp=95;}
    if(bp==='bp2'){p.sbp=165;p.dbp=105;}
    if(bp==='bp_urgent'){p.sbp=180;p.dbp=110;}
    return p;
  }
  const list=xs=>xs.length?`<ul>${xs.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:'<p>확인된 항목 없음 · 체크하지 않은 항목은 미확인</p>';
  function card(title,category,risk,start,target,trace,missing,ref,level='') {
    return `<article class="ir-card ${level}"><h3>${title}</h3><p><strong>분류:</strong> ${esc(category)}</p><p><strong>위험군:</strong> ${esc(risk)}</p><h4>치료 시작·유지 방향</h4><p>${esc(start)}</p><h4>치료 목표</h4><p>${esc(target)}</p><details open><summary>이렇게 판단한 이유</summary>${list(trace)}</details><details><summary>추가 확인 사항과 근거</summary>${list(missing)}<p class="ir-source"><a href="${ref.url}" target="_blank" rel="noopener noreferrer">${esc(ref.name)}</a> · ${esc(ref.section)}</p></details></article>`;
  }
  let evaluated=false;
  function render() {
    const p=facts();
    if(has('acute')||has('pregnant')) {
      out.innerHTML=`<h3 class="ic-output-title">평가 결과</h3><div class="ic-notice danger">${has('acute')?'현재 선택한 급성 증상은 즉시 응급 평가가 우선입니다. ':''}${has('pregnant')?'임신 중에는 이 일반 성인 알고리즘을 적용하지 말고 산과·전문 진료를 받으세요.':''}</div><div class="ir-note">안전을 위해 일반 성인 위험군·치료 알고리즘의 결과를 표시하지 않습니다.</div>`;
      return;
    }
    const data=E.evaluate(p), r=Object.fromEntries(data.results.map(x=>[x.id,x]));
    const bp=pick(bpKeys), sugar=pick(sugarKeys), ldl=pick(ldlKeys), bone=pick(tKeys);
    const riskNames=['age65','smoking','obesity','familyEarlyCvd','familyDm','familyHtn','familyHld','parentHip','inactive','steroids','fallRisk'];
    const chosen=keys=>keys.filter(has).map(k=>labels[k]);
    const safety=has('acute');
    const bpClass={bp_low:'진료실 혈압 140/90 미만 · 세부 단계 미확정',bp1:'고혈압 1기 범위',bp2:'고혈압 2기 범위',bp_urgent:'심한 혈압 상승 · 조속한 평가'}[bp]||'진료실 혈압 정보 부족';
    let bpStart=bp==='bp_urgent'?'조속히 의료진이 표적장기손상과 측정값을 확인합니다. 급성 증상이 있으면 응급 평가가 우선입니다.':bp==='bp2'?'반복 측정으로 확인되면 생활요법과 약물치료를 신속히 병행하는 것을 검토합니다.':bp==='bp1'?'반복 측정 후 중·고위험이면 생활요법과 약물 시작, 확실한 저위험이면 생활요법 우선 후 재평가를 검토합니다.':bp==='bp_low'?'기존 고혈압·복용 약물이 있으면 목표와 치료를 확인하고 임의로 중단하지 않습니다.':'혈압 측정 및 반복 확인 후 치료 개시 또는 유지 여부를 평가합니다.';
    if(has('onBp'))bpStart='현재 혈압약 사용 중: 신규 개시가 아니라 복약·가정혈압·목표·부작용 확인 후 유지 또는 조정을 검토합니다. '+bpStart;
    if(safety)bpStart='새로운 흉통·호흡곤란·마비·언어장애·의식저하가 있으면 즉시 응급 평가가 우선입니다.';
    const bpTrace=[...(bp?[labels[bp]]:[]),...chosen(['htn','dm','hld','cad','atheroscleroticStroke','pad','ckd','hmod','age65','smoking','obesity','familyEarlyCvd']),bp?'선택된 혈압 범위와 체크된 인자로 위험행렬을 평가합니다. 범위를 대표하는 내부 예시값은 실제 측정값이 아닙니다.':'혈압 미선택으로 단계와 혈압별 위험행렬을 확정하지 않습니다.'];
    const bpRisk=bp&&bp!=='bp_low'?(r.bp?.risk||'위험군 계산 정보 부족'):'혈압 세부 단계·미확인 위험인자 확인 필요';
    const bpTarget=bp&&r.bp?.target?r.bp.target:'위험도에 따라 <140/90 또는 <130/80 mmHg 등 개별화';
    const dmConfirmed=has('dm')||has('onDm');
    const dmCategory=dmConfirmed?'기존 당뇨병 진단 또는 치료 중':sugar==='a1c_high'?(has('dmRepeat')?'진단 범위 반복 확인 · 유형 확인 필요':'당뇨병 의심 · 확진 확인 필요'):sugar==='a1c_pre'?'당뇨병 전단계 범위':sugar==='a1c_low'?'입력한 HbA1c는 5.7% 미만':'검사·진단 정보 부족';
    const dmRisk=(has('cad')||has('atheroscleroticStroke')||has('pad')||has('ckd'))?'심뇌혈관·콩팥 동반질환이 선택됨':chosen(['familyDm','obesity','htn','hld']).length?'선택된 위험인자 있음 · 정량 위험도 확정 불가':'위험인자 미확인 · 저위험 확정 불가';
    const dmStart=dmConfirmed?'당뇨병 유형과 현재 약제·저혈당·신기능을 확인해 식사·운동과 약물 치료의 유지 또는 조정을 검토합니다.':sugar==='a1c_high'?'명백한 고혈당이 아니면 다른 날 반복검사 등으로 확진하고 유형을 확인한 뒤 치료를 결정합니다.':sugar==='a1c_pre'?'식사·운동·체중 관리를 시행하고 혈당을 정기 추적합니다.':'위험인자와 연령을 고려해 HbA1c·공복혈당 등 선별검사를 확인합니다.';
    const dmTarget=dmConfirmed?'2형 당뇨병의 일반 HbA1c 목표 <6.5%, 1형은 일반적으로 <7.0%; 저혈당·노쇠 등에 따라 개별화':'확진·유형 확인 후 결정; 전단계는 진행 예방';
    const dmTrace=[...(sugar?[labels[sugar]]:[]),...chosen(['dm','onDm','dmRepeat','familyDm','obesity','htn','hld','cad','atheroscleroticStroke','ckd'])];
    const lr=r.lipid;
    let lipidStart=has('onLipid')?'지질강하제 사용 중: 현재 LDL이 치료로 낮아진 값인지와 목표·복약·부작용을 확인해 유지 또는 조정합니다.':ldl==='ldl190'?'치료 전 LDL ≥190이 확인되면 이차 원인·가족성 고콜레스테롤혈증을 확인하고 스타틴 치료를 평가합니다.':has('cad')||has('atheroscleroticStroke')||has('pad')?'기존 죽상경화성 질환의 이차예방 치료와 최대 내약 스타틴 등 약물치료를 검토합니다.':has('dm')?'당뇨병 유병기간·장기손상·추가 위험인자와 실제 LDL 수치를 확인해 스타틴 치료 여부와 강도를 결정합니다.':ldl?'위험군을 확정하고 실제 LDL 수치와 생활요법 시행 여부에 따라 약물 시작을 검토합니다.':'LDL 검사와 위험군·현재 복용약을 확인해 치료를 결정합니다.';
    if(!has('onLipid')&&ldl&&ldl!=='ldl190'&&!has('cad')&&!has('atheroscleroticStroke')&&!has('pad')) {
      if(lr?.category?.startsWith('고위험 당뇨병군')&&ldl!=='ldl_low')lipidStart='고위험 당뇨병군에 해당하는 체크와 LDL ≥70 범위: 스타틴 치료를 검토합니다. 실제 LDL과 현재 약물·신기능 및 지침 적용 조건을 확인하세요.';
      else if(lr?.category?.startsWith('중등도 위험군')&&['ldl130','ldl160'].includes(ldl))lipidStart='확인된 주요 위험인자에 따른 중등도 위험군과 LDL ≥130 범위: 수주–수개월 생활요법 후에도 지속되면 스타틴 치료를 고려합니다. 상위 위험군 배제와 실제 LDL을 확인하세요.';
      else if(lr?.category?.startsWith('저위험군')&&ldl==='ldl160')lipidStart='저위험군이 확인되고 LDL ≥160이 지속되면 생활요법 후 스타틴을 고려할 수 있습니다. 체크하지 않은 병력은 미확인이므로 저위험 확정 전 확인이 필요합니다.';
    }
    const lipidTrace=[...chosen(['cad','atheroscleroticStroke','pad','dm','dmOrgan','htn','onBp','smoking','familyEarlyCvd','age65','hdl_low','hdl_high','onLipid']),...(ldl?[labels[ldl]]:[])];
    if(has('hdl_high'))lipidTrace.push('HDL 60–100은 지질 주요 위험인자 계산에서 보호인자 감산을 적용합니다.');
    const boneCategory=bone==='t_ost'?(has('eligible')?'T-score 기준 골다공증 범위':'T-score ≤−2.5 · 적용 대상 확인 필요'):bone==='t_low'?(has('eligible')?'골감소증 범위':'골감소 범위 · 적용 대상 확인 필요'):bone==='t_normal'?'T-score ≥−1.0 · 적용 대상 확인 필요':has('osteoporosis')?'기존 골다공증 진단':'골밀도 정보 부족';
    const fracture=has('fragility')||has('hipSpineFracture')||has('recentFracture')||has('multipleFracture');
    const boneRisk=has('recentFracture')||has('multipleFracture')?'최근/다발 취약골절: 매우 높은 골절 위험 가능 · 골절 부위와 대상 확인':fracture?'취약골절 병력: 높은 골절 위험 가능 · 부위와 시기 확인':bone==='t_ost'&&has('eligible')?'골다공증 범위 · 골절 여부에 따른 위험 세분화 필요':'위험도 미확정: 골밀도·골절력·연령·FRAX 등 확인';
    let boneStart=fracture?'취약골절 부위·시기, DXA와 이차 원인을 확인하고 골절 예방 약물치료를 평가합니다. 고관절·척추 취약골절은 특히 우선 평가합니다.':bone==='t_ost'&&has('eligible')?'골밀도·골절 위험 및 이차 원인을 확인하고 골다공증 약물치료를 검토합니다.':bone==='t_low'?'골절 병력·공식 한국 FRAX 등 전체 위험도에 따라 약물치료 여부를 결정합니다.':'골밀도 검사 대상과 골절 위험인자 및 기존 치료를 확인합니다.';
    if(has('onBone')||has('denosumab'))boneStart='현재 골다공증 치료의 복용·주사 일정과 골절 발생 여부를 확인하여 유지·변경을 검토합니다. '+boneStart;
    if(has('missedDenosumab'))boneStart+=' 데노수맙 지연·중단 시 반동성 척추골절 위험 때문에 임의 중단하지 말고 후속 치료를 신속히 상담하세요.';
    const boneTrace=[...chosen(['eligible','osteoporosis','parentHip','steroids','fallRisk','fragility','hipSpineFracture','recentFracture','multipleFracture','onBone','denosumab','missedDenosumab']),...(bone?[labels[bone]]:[])];
    const refs={bp:r.bp.refs[0],dm:r.dm.refs[0],lipid:r.lipid.refs[0],bone:r.bone.refs[0]};
    const warning=(safety||has('pregnant'))?`<div class="ic-notice danger">${safety?'현재 선택한 급성 증상은 즉시 응급 평가가 우선입니다. ':''}${has('pregnant')?'임신 중에는 이 일반 성인 알고리즘을 적용하지 말고 산과·전문 진료를 받으세요.':''}</div>`:'';
    if(safety||has('pregnant')){out.innerHTML=`<h3 class="ic-output-title">평가 결과</h3>${warning}<div class="ir-note">안전을 위해 일반 성인 위험군·치료 알고리즘의 결과를 표시하지 않습니다. 응급 또는 임신 관련 전문 평가가 우선입니다.</div>`;return;}
    out.innerHTML=`<h3 class="ic-output-title">질환별 분류와 치료 방향</h3>${warning}<div class="ic-results">${card('고혈압',bpClass,bpRisk,bpStart,bpTarget,bpTrace,['정확한 혈압·반복 측정·가정혈압·나이·기존 약제·장기손상 및 미체크 위험인자 확인'],refs.bp,bp==='bp_urgent'?'danger':bp==='bp2'?'warn':'')}${card('당뇨병',dmCategory,dmRisk,dmStart,dmTarget,dmTrace,['당뇨병 유형, 실제 HbA1c/공복혈당, 확진 검사·저혈당·약제·신기능 확인'],refs.dm,sugar==='a1c_high'?'warn':'')}${card('이상지질혈증',lr?.category||'위험군 미확정',lr?.category||'미확인',lipidStart,lr?.target||'실제 LDL과 위험군 확인 후 결정',lipidTrace,['치료 전·현재 LDL 정확한 수치, 당뇨 유병기간·장기손상·조기 가족력·연령·미확인 위험인자'],refs.lipid,ldl==='ldl190'?'warn':'')}${card('골다공증',boneCategory,boneRisk,boneStart,'취약골절 예방, 골밀도와 치료 안전성·낙상 위험을 개인별 추적',boneTrace,['성별·실제 나이·폐경, DXA 부위별 수치·골절 시기/부위 및 공식 FRAX 확인'],refs.bone,fracture||bone==='t_ost'?'warn':'')}</div><p class="ir-source">분류 알고리즘은 기존 국내 지침 기반 상세 엔진과 체크된 인자를 함께 사용합니다. 범위별 내부 예시값은 실제 환자 측정치가 아닙니다. 체크하지 않은 위험인자는 정상·없음으로 취급하지 않습니다. 환자 정보는 브라우저 메모리에만 유지되며 전송하거나 저장하지 않습니다.</p>`;
  }
  form.addEventListener('change',e=>{const key=e.target.name;for(const group of mutuallyExclusive)if(group.includes(key)&&e.target.checked)group.forEach(k=>{if(k!==key)form.elements[k].checked=false;});if(evaluated)render();});
  form.addEventListener('submit',e=>{e.preventDefault();evaluated=true;render();out.scrollIntoView({behavior:'smooth',block:'start'});});
  form.addEventListener('reset',()=>{evaluated=false;out.innerHTML='';});
})();
