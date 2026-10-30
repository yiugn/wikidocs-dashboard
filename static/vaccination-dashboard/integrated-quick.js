/* The quick assessment is local-only and deliberately does not infer missing facts. */
(() => {
  'use strict';
  const panel = document.querySelector('#integrated-clinic');
  if (!panel) return;
  const first = panel.querySelector('.ic-diseases');
  const advanced = document.createElement('details');
  advanced.className = 'iq-advanced';
  advanced.innerHTML = '<summary>상세 입력으로 더 정확하게 평가하기</summary><p class="ic-hint">나이, 실제 수치, 치료 여부와 위험인자를 입력하여 치료 시작·목표 및 판단 근거를 더 자세히 확인합니다.</p>';
  first.before(advanced);
  while (advanced.nextSibling) advanced.appendChild(advanced.nextSibling);
  const style = document.createElement('style');
  style.textContent = `.iq-intro{margin:20px 0 12px;color:#1d5262}.iq-form{display:grid;gap:12px}.iq-question{border:1px solid #d4e5e8;border-radius:13px;background:#fff;padding:16px}.iq-question legend{font-weight:750;color:#18475a;font-size:16px;padding:0 5px}.iq-help{font-size:13px;color:#5a6f7a;margin:0 0 10px}.iq-opts{display:flex;gap:8px;flex-wrap:wrap}.iq-opts label{display:flex;gap:7px;align-items:center;line-height:1.5;background:#f1f7f8;border:1px solid #d9e7e9;padding:9px 11px;border-radius:9px;cursor:pointer;margin:0;font-size:14px}.iq-opts label:has(input:checked){background:#d8f0ed;border-color:#2b918d;color:#075c60}.iq-advanced{margin:22px 0;border:1px solid #c8dce0;border-radius:13px;padding:17px;background:#f8fbfc}.iq-advanced>summary{cursor:pointer;color:#14536a;font-weight:750}.iq-advanced:not([open])>*:not(summary){display:none}.iq-output{margin:20px 0}.iq-output:empty{display:none}.iq-output .ic-results{margin-top:12px}.iq-result{border:1px solid #d4e5e8;border-top:4px solid #16828a;border-radius:12px;background:white;padding:16px;line-height:1.7}.iq-result h4{margin:0 0 8px;color:#164a5d}.iq-result p{margin:6px 0;font-size:14px}.iq-result.warn{border-top-color:#c77b24}.iq-result.danger{border-top-color:#c43d35}.iq-source{font-size:12px;color:#58707a}.iq-form button{width:fit-content}.iq-limits{font-size:13px;color:#755522;background:#fff7e7;padding:12px;border-radius:8px}`;
  document.head.appendChild(style);
  const quick = document.createElement('section');
  quick.setAttribute('aria-label', '5문항 간편 평가');
  quick.innerHTML = `<h3 class="iq-intro">5문항 간편 평가</h3><p class="ic-hint">해당하는 보기를 체크하세요. 모르는 항목은 비워 두거나 ‘모름’을 선택해도 됩니다. 1번은 복수 선택, 나머지는 각 문항에서 하나만 선택합니다.</p>
  <form class="iq-form" autocomplete="off">
    <fieldset class="iq-question"><legend>1. 기존에 진단받은 질환이나 골절이 있나요?</legend><p class="iq-help">해당되는 것만 모두 선택 · 선택하지 않은 항목은 ‘없음’이 아니라 ‘미확인’입니다.</p><div class="iq-opts">
      <label><input type="checkbox" name="history" value="bp">고혈압</label><label><input type="checkbox" name="history" value="dm">당뇨병</label><label><input type="checkbox" name="history" value="lipid">이상지질혈증</label><label><input type="checkbox" name="history" value="bone">골다공증</label><label><input type="checkbox" name="history" value="ascvd">심근경색·뇌졸중 등 심뇌혈관질환</label><label><input type="checkbox" name="history" value="fracture">가벼운 충격으로 발생한 골절</label></div></fieldset>
    <fieldset class="iq-question"><legend>2. 최근 진료실 혈압은 어느 범위인가요?</legend><p class="iq-help">수축기와 이완기 중 높은 쪽 기준으로 선택합니다. 여러 번 측정한 평균을 권장합니다.</p><div class="iq-opts">
      <label><input type="checkbox" name="bp" value="low">140/90 미만</label><label><input type="checkbox" name="bp" value="stage1">140–159 또는 90–99</label><label><input type="checkbox" name="bp" value="stage2">160–179 또는 100–119</label><label><input type="checkbox" name="bp" value="urgent">180 이상 또는 120 이상</label><label><input type="checkbox" name="bp" value="unknown">모름</label></div></fieldset>
    <fieldset class="iq-question"><legend>3. 최근 당화혈색소(HbA1c)는 얼마인가요?</legend><p class="iq-help">검사 결과지의 HbA1c(%)를 기준으로 선택합니다.</p><div class="iq-opts">
      <label><input type="checkbox" name="sugar" value="normal">5.7% 미만</label><label><input type="checkbox" name="sugar" value="prediabetes">5.7–6.4%</label><label><input type="checkbox" name="sugar" value="diabetes">6.5% 이상</label><label><input type="checkbox" name="sugar" value="unknown">모름 / 검사 안 함</label></div></fieldset>
    <fieldset class="iq-question"><legend>4. 최근 LDL 콜레스테롤은 얼마인가요?</legend><p class="iq-help">검사 결과지의 LDL-C (mg/dL) 기준입니다.</p><div class="iq-opts">
      <label><input type="checkbox" name="ldl" value="low">100 미만</label><label><input type="checkbox" name="ldl" value="mid">100–159</label><label><input type="checkbox" name="ldl" value="high">160–189</label><label><input type="checkbox" name="ldl" value="veryhigh">190 이상</label><label><input type="checkbox" name="ldl" value="unknown">모름 / 검사 안 함</label></div></fieldset>
    <fieldset class="iq-question"><legend>5. 골밀도 검사 결과는 어떤가요?</legend><p class="iq-help">DXA 검사에서 유효한 부위의 T-score 중 가장 낮은 값을 선택합니다.</p><div class="iq-opts">
      <label><input type="checkbox" name="bone" value="normal">−1.0 이상</label><label><input type="checkbox" name="bone" value="low">−1.0 미만 ~ −2.5 초과</label><label><input type="checkbox" name="bone" value="osteoporosis">−2.5 이하</label><label><input type="checkbox" name="bone" value="unknown">모름 / 검사 안 함</label></div></fieldset>
    <div class="ic-toolbar"><button class="ic-primary" type="submit">5문항 결과 보기</button><button type="reset">선택 초기화</button></div>
  </form><div class="iq-limits">간편판은 성인 참고용이며 확진·자동 처방이 아닙니다. 나이, 임신·폐경, 검사 반복 여부, 약물, 합병증과 위험인자가 빠져 치료 시작과 목표는 개인별로 확정할 수 없습니다. 급성 흉통·호흡곤란·마비·의식 저하 등은 즉시 응급 평가가 필요합니다.</div><div class="iq-output" aria-live="polite"></div>`;
  advanced.before(quick);
  const form = quick.querySelector('form');
  const output = quick.querySelector('.iq-output');
  const get = name => form.querySelector(`input[name="${name}"]:checked`)?.value || 'unknown';
  const has = value => !!form.querySelector(`input[name="history"][value="${value}"]:checked`);
  const card = (title, result, reason, next, level='') => `<article class="iq-result ${level}"><h4>${title}</h4><p><strong>${result}</strong></p><p>${reason}</p><p>${next}</p></article>`;
  let evaluated = false;
  function render() {
    const bp=get('bp'), sugar=get('sugar'), ldl=get('ldl'), bone=get('bone');
    const hx = (key, text) => has(key) ? `<p>기존 ${text} 진단을 선택했습니다. 이번 수치가 낮아도 기존 진단이나 치료 중단을 의미하지 않습니다.</p>` : '';
    const bpText = {
      low:['140/90 미만','선택한 진료실 혈압 범위가 140/90 미만입니다.','기존 진단이나 치료 여부에 따라 목표가 다르므로 정상 확정이나 약 중단을 뜻하지 않습니다.'],
      stage1:['고혈압 1기 범위','수축기 140–159 또는 이완기 90–99 범위입니다.','다른 날 반복 측정과 가정혈압 등으로 확인하고, 동반 위험에 따라 치료를 검토합니다.'],
      stage2:['고혈압 2기 범위','수축기 160–179 또는 이완기 100–119 범위입니다.','조속히 진료를 받아 반복 측정과 치료 필요성을 평가하세요.'],
      urgent:['매우 높은 혈압 · 신속 평가','수축기 180 이상 또는 이완기 120 이상입니다.','안정 후 재측정하고 신속히 의료진과 상의하세요. 흉통, 호흡곤란, 마비, 심한 두통 등 급성 증상이 있으면 즉시 응급실로 가세요.'],
      unknown:['판정 보류','진료실 혈압이 입력되지 않았습니다.','표준 측정과 여러 차례의 평균 혈압을 확인하세요.']
    }[bp];
    const sugarText = {
      normal:['5.7% 미만','선택한 HbA1c가 당뇨병 선별 역치 미만입니다.','기존 당뇨병이나 치료 중이라면 현재 조절 상태와 진단은 별도로 판단합니다.'],
      prediabetes:['당뇨병 전단계 범위','HbA1c 5.7–6.4%를 선택했습니다.','생활습관 개선과 추적검사를 상담하세요. 기존 당뇨병 치료 중 수치는 별도 해석이 필요합니다.'],
      diabetes:['당뇨병 진단 범위','HbA1c 6.5% 이상을 선택했습니다.','명백한 고혈당이 아니라면 다른 날 반복 검사 등으로 진단을 확인해야 합니다.'],
      unknown:['판정 보류','HbA1c 정보가 없습니다.','HbA1c 또는 공복혈장혈당 검사를 확인하세요.']
    }[sugar];
    const lipidText = {
      low:['LDL-C 100 미만','선택한 LDL-C 범위입니다.','목표는 심뇌혈관질환·당뇨·치료 여부에 따라 100보다 낮을 수 있습니다.'],
      mid:['LDL-C 100–159','선택한 LDL-C 범위입니다.','위험도와 치료 여부를 확인해야 치료 시작과 목표를 정할 수 있습니다.'],
      high:['LDL-C 160–189','LDL-C가 높은 범위입니다.','심혈관 위험인자와 치료 전 수치, 이차 원인을 확인해 진료 상담을 받으세요.'],
      veryhigh:['LDL-C 190 이상','심한 LDL-C 상승 범위입니다.','치료 전 수치인지 확인하고 가족성 고콜레스테롤혈증과 이차 원인 및 약물치료를 진료에서 평가하세요.'],
      unknown:['판정 보류','LDL-C 정보가 없습니다.','지질검사 결과와 치료 여부를 확인하세요.']
    }[ldl];
    const boneText = {
      normal:['T-score −1.0 이상','선택한 골밀도 범위입니다.','골절 병력이 있다면 골밀도가 높아도 별도 평가가 필요합니다.'],
      low:['골감소증 범위','T-score가 −1.0 미만이면서 −2.5 초과입니다.','골절 병력과 연령 등 전체 위험을 평가해야 약물치료 여부를 결정할 수 있습니다.'],
      osteoporosis:['골다공증 범위','T-score −2.5 이하를 선택했습니다.','취약골절과 치료 여부를 확인해 의료진과 치료를 상담하세요.'],
      unknown:['판정 보류','DXA T-score 정보가 없습니다.','필요한 경우 골밀도 검사와 골절 위험 평가를 받으세요.']
    }[bone];
    const caveat = has('ascvd') ? '<p class="iq-limits">심뇌혈관질환 병력이 선택되어 LDL 목표가 더 엄격할 수 있습니다. 정확한 질환 유형과 치료 여부를 상세 평가에서 확인하세요.</p>' : '';
    const fracture = has('fracture') ? '<p class="iq-limits">취약골절 병력이 선택되었습니다. T-score와 관계없이 골절 부위·시기와 추가 치료 필요성을 진료에서 평가하세요.</p>' : '';
    output.innerHTML = `<h3 class="ic-output-title">간편 평가 결과</h3>${caveat}${fracture}<div class="ic-results">${card('혈압',...bpText,bp==='urgent'?'danger':bp==='stage1'||bp==='stage2'?'warn':'').replace('</article>',hx('bp','고혈압')+'</article>')}${card('혈당',...sugarText,sugar==='diabetes'?'warn':'').replace('</article>',hx('dm','당뇨병')+'</article>')}${card('지질',...lipidText,ldl==='veryhigh'?'warn':'').replace('</article>',hx('lipid','이상지질혈증')+'</article>')}${card('골밀도',...boneText,bone==='osteoporosis'?'warn':'').replace('</article>',hx('bone','골다공증')+'<p>T-score의 일반 성인 분류는 폐경 후 여성과 50세 이상 남성에게 주로 적용하며, 폐경 전 여성·50세 미만 남성은 Z-score 등을 별도로 해석합니다.</p></article>')}</div><p class="iq-source">근거: <a href="https://health.kdca.go.kr/healthinfo/biz/health/gnrlzHealthInfo/gnrlzHealthInfo/gnrlzHealthInfoView.do?cntnts_sn=6765" target="_blank" rel="noopener">질병관리청 고혈압</a> · <a href="https://www.diabetes.or.kr/bbs/?category=B&amp;code=faq" target="_blank" rel="noopener">대한당뇨병학회 진단 기준</a> · <a href="https://health.kdca.go.kr/healthinfo/biz/health/gnrlzHealthInfo/gnrlzHealthInfo/gnrlzHealthInfoView.do?cntnts_sn=5833" target="_blank" rel="noopener">질병관리청 골다공증</a> · 상세 위험도와 지질 기준은 아래 상세 평가의 원문 근거를 확인하세요.</p>`;
  }
  form.addEventListener('change', e => { if (e.target.type === 'checkbox' && e.target.name !== 'history' && e.target.checked) form.querySelectorAll(`input[name="${e.target.name}"]`).forEach(x => { if (x !== e.target) x.checked = false; }); if (evaluated) render(); });
  form.addEventListener('submit', e => { e.preventDefault(); evaluated = true; render(); output.scrollIntoView({behavior:'smooth',block:'start'}); });
  form.addEventListener('reset', () => { evaluated = false; output.innerHTML = ''; });
})();
