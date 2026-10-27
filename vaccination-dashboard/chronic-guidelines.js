/* Domestic adult clinical reference. Reviewed 2026-10-27. No patient data, network calls or storage. */
(() => {
  'use strict';
  const reviewed = '2026-10-27';
  const table = (headers, rows, note = '') => `<div class="ch-table"><table><thead><tr>${headers.map(h => `<th scope="col">${h}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map((c,i) => i ? `<td>${c}</td>` : `<th scope="row">${c}</th>`).join('')}</tr>`).join('')}</tbody></table></div>${note ? `<p class="ch-note">${note}</p>` : ''}`;
  const card = (title, body, wide = false) => `<article class="ch-card${wide ? ' ch-wide' : ''}"><h3>${title}</h3>${body}</article>`;
  const list = items => `<ul>${items.map(x => `<li>${x}</li>`).join('')}</ul>`;
  const alert = (text, danger = false) => `<div class="ch-alert${danger ? ' ch-danger' : ''}">${text}</div>`;
  const sources = entries => card('근거 · 적용 범위', `<ol class="ch-sources">${entries.map(([name,url,detail]) => `<li><a href="${url}" target="_blank" rel="noopener noreferrer">${name}</a>${detail ? `<span>${detail}</span>` : ''}</li>`).join('')}</ol>`, true);
  const bpSources = [
    ['대한고혈압학회 제6판, 2026 (수정본)', 'https://www.koreanhypertension.org/reference/guide?idno=10446&mode=read', '2026-05-22 게시. 학회 제공 전문 링크.'],
    ['2026 지침 개정 하이라이트', 'https://pmc.ncbi.nlm.nih.gov/articles/PMC13197191/', '진단 분류, 위험기반 목표, CKD·뇌졸중·노쇠 관련 변경 사항 확인.']
  ];
  const dmSources = [
    ['대한당뇨병학회 2025 제9판 · 최종 전문', 'https://new.diabetes.or.kr/bbs/?code=guide&mode=view&number=2078&page=1', '정오표 반영본. 분류·진단, 혈당 목표, 약물·생활습관·합병증 관리.'],
    ['학회 공개 전문 PDF', 'https://diabetes.or.kr/bbs/download.php?code=guide&number=1522', '이 문서는 비임신 성인 진료 참고용. 임신당뇨병·소아는 별도 지침.']
  ];
  const lipidSources = [
    ['한국지질·동맥경화학회 이상지질혈증 진료지침 2026', 'https://www.lipid.or.kr/reference/guideline.php?boardid=guideline&idx=1456&mode=view', '2026-09-10 발간. 지침 전체본 링크.'],
    ['2026 국문 요약 슬라이드', 'https://www.lipid.or.kr/reference/guideline.php?boardid=guideline&idx=1454&mode=view', '4–10, 16–19쪽의 위험인자·목표·치료 전략을 확인. 원문 도표를 복제하지 않고 재정리.']
  ];
  const boneSources = [
    ['대한골대사학회 진료지침 목록', 'https://www.ksbmr.org/bbs/?code=guideline', '2026 개정판 발간 확인. 비공개 전문의 세부 개정 내용은 미확인.'],
    ['대한골대사학회 폐경 후 골다공증 치료전략 권고안, 2023', 'https://www.e-jbm.org/upload/pdf/jbm-2023-30-4-289.pdf', '국내 골절위험군과 순차치료. 폐경 후 여성 대상 권고를 다른 군에 무조건 적용하지 않음.'],
    ['대한폐경학회 골다공증 지침, 2024 Part I', 'https://e-jmm.org/pdf/10.6118/jmm.24000', 'DXA 진단, 영양·운동에 대한 공개 국내 지침.'],
    ['대한골대사학회 비타민 D 권고안, 2022', 'https://www.e-jbm.org/upload/pdf/jbm-2022-29-4-205.pdf', '혈중 농도·골절 위험에 따른 보충.'],
    ['치과 치료 전후 골다공증 약물 조정 지침, 2026', 'https://www.ksbmr.org/bbs/index.html?code=advice&mode=view&number=2010', '치과 치료 전 처방의·치과의 협의. 일률적 휴약 지시를 제공하지 않음.']
  ];
  const sections = [
    { id: 'chronic', label: '만성질환 빠른 비교', title: '만성질환 임상 참고', edition: '국내 학회 공개 근거', lead: '진단을 붙이는 기준과 치료로 도달하려는 목표를 분리해서 확인하십시오.', content:
      card('네 질환 한눈에 보기', table(['질환', '진단의 출발점', '치료의 중심', '반드시 구분'], [
        ['고혈압', '반복 진료실 혈압 ≥140 또는 ≥90 mmHg', '전체 심혈관위험에 맞춘 혈압 조절', '진단 역치 ≠ 모든 환자의 목표 혈압'],
        ['당뇨병', 'HbA1c·공복·75 g 부하·증상 동반 무작위 혈당', '혈당 + 심장·신장 보호 + 저혈당 예방', '1형·2형·기타 원인 / 임신 기준 별도'],
        ['이상지질혈증', '지질검사와 이차 원인 평가', '심혈관위험군별 LDL 목표', '검사실 정상범위 ≠ 개인별 치료 목표'],
        ['골다공증', 'DXA + 취약골절 + 임상 위험', '골절 예방과 안전한 순차치료', '골밀도 진단 ≠ 약물 시작·중단 기준']
      ]), true) + card('사용 전 확인', list([
        '성인 진료를 돕는 참고자료이며 자동 진단·처방 도구가 아닙니다. 환자별 병력, 신기능, 임신 가능성, 약물상호작용을 먼저 확인합니다.',
        '의학적 권고, 국내 제품 허가, 건강보험 급여는 서로 다릅니다. 처방 시점의 허가·급여 조건은 별도로 확인합니다.',
        '응급 증상은 표의 수치를 모두 충족할 때까지 기다리지 않습니다. 증상과 장기 손상 여부를 우선합니다.'
      ]), true) + alert('<strong>근거 투명성:</strong> 고혈압 2026·당뇨병 2025·이상지질혈증 2026을 확인했습니다. 골다공증 2026판은 발간만 확인했으며, 아래 골다공증 내용은 공개 국내 권고안에 근거한 잠정 참고입니다.')
    },
    { id: 'ch-hypertension', label: '고혈압', title: '고혈압', edition: '대한고혈압학회 2026 제6판', lead: '정확히 측정하고, 진료실 밖 혈압으로 확인하고, 위험도에 따라 목표를 정합니다.', content:
      card('01 · 진단과 분류', table(['분류', '수축기 / 이완기 (mmHg)'], [
        ['정상', '<120 그리고 <80'], ['주의혈압', '120–129 그리고 <80'],
        ['고혈압 전단계', '130–139 또는 80–89'], ['1기', '140–159 또는 90–99'], ['2기', '≥160 또는 ≥100'],
        ['수축기 단독 / 이완기 단독', '≥140이면서 <90 / <140이면서 ≥90']
      ], '서로 다른 범주이면 높은 쪽으로 분류. 단회 측정으로 확진하지 않습니다.')) +
      card('02 · 확진과 초기 평가', list([
        '검증된 상완 커프, 5분 안정, 적절한 커프 크기로 반복 측정합니다. 가정혈압·활동혈압으로 백의·가면 고혈압을 구별합니다.',
        '고혈압 역치: 가정·주간 활동혈압 ≥135/85, 24시간 평균 ≥130/80, 야간 평균 ≥120/70 mmHg.',
        '흡연·비만·당뇨·지질, 크레아티닌/eGFR·전해질·요알부민·심전도 및 표적장기 손상을 확인합니다. 젊은 발병·저칼륨·조절 불량이면 이차 원인을 평가합니다.'
      ])) +
      card('03 · 치료 목표와 시작', table(['상황', '진료실 목표'], [
        ['중·저위험 / 일반 고령', '<140/90 mmHg'],
        ['고위험·당뇨·심혈관질환·CKD·뇌졸중 병력', '<130/80 mmHg; 내약성·예외 확인'],
        ['뇌경색 + 두개내 동맥 협착', '<140/90 mmHg; 급성기 별도'],
        ['노쇠·≥85세·기립저혈압·제한된 기대여명', '개별화; 과도한 강압 방지']
      ], '2기나 고위험은 약물치료를 신속히 검토. 고위험 고혈압 전단계도 약물을 고려할 수 있으나 일괄 처방하지 않습니다. CKD의 표준화 측정 수축기 <120 목표는 별도 조건입니다.')) +
      card('04 · 약물 전략', list([
        'ACE억제제/ARB, 칼슘차단제, 이뇨제, 베타차단제를 동반질환과 내약성에 맞춰 선택합니다. 병용 시 단일정 복합제를 고려합니다.',
        '알부민뇨·심부전·관상동맥질환 등 동반질환에 맞춰 약제를 조정합니다. ACE억제제+ARB 병용은 피하고 임신 중 두 계열을 사용하지 않습니다.',
        '조절 불량은 복약·측정·백의효과·이차 원인부터 재평가합니다. 추가 이뇨제·MRA 등은 K·신기능을 확인하며 선택합니다.'
      ])) +
      card('05 · 생활습관', list([
        '염분과 가공식품·국물 섭취를 줄이고 채소·통곡·생선 중심으로 먹습니다. 과체중 감량, 규칙적 유산소·근력 운동을 병행합니다.',
        '담배·전자담배를 끊고 음주를 줄입니다. 수면무호흡 평가와 수면·스트레스 관리도 함께 시행합니다.'
      ])) +
      card('06 · 추적과 예후', list([
        '가정혈압 기록, 기립 증상, 복약·부작용을 확인하고 약제 변경 후 신기능·전해질을 필요에 따라 재검합니다.',
        '혈압만 아니라 흡연·혈당·지질을 함께 관리해야 뇌졸중·심근경색·심부전·신장병 위험을 낮출 수 있습니다.'
      ])) + alert('<strong>즉시 평가:</strong> 심한 혈압 상승(예: ≥180/110 mmHg)에 흉통·호흡곤란·신경학적 이상·시력 이상이 동반되면 급성 장기 손상을 의심합니다. 수치만 보고 집에서 급격히 낮추지 마십시오.', true) + sources(bpSources)
    },
    { id: 'ch-diabetes', label: '당뇨병', title: '당뇨병', edition: '대한당뇨병학회 2025 제9판', lead: '비임신 성인 기준입니다. 혈당 수치뿐 아니라 질환 유형과 심장·신장 위험을 함께 봅니다.', content:
      card('01 · 진단 기준', table(['검사 / 조건', '당뇨병', '당뇨병 전단계'], [
        ['HbA1c', '≥6.5%', '5.7–6.4%'], ['8시간 이상 공복 혈장포도당', '≥126 mg/dL', '100–125 mg/dL'],
        ['75 g 경구포도당부하 2시간', '≥200 mg/dL', '140–199 mg/dL'],
        ['전형적 증상 + 무작위 혈장포도당', '≥200 mg/dL', '해당 없음']
      ], '명백한 증상 동반 고혈당이 아니면 반복검사로 확인합니다. 동시에 시행한 서로 다른 두 검사가 진단 기준을 충족하면 확진할 수 있습니다. 빈혈·수혈·혈색소 이상 등에서는 HbA1c 신뢰도를 확인합니다.')) +
      card('02 · 유형·선별·초기 평가', list([
        '1형은 인슐린 결핍, 2형은 인슐린저항성과 분비 저하가 중심입니다. 임신당뇨·췌장질환·약물·단일유전자 원인도 구분합니다.',
        '35세 이상 성인, 또는 위험인자가 있는 19세 이상 성인은 선별검사를 시행합니다. 정상이어도 매년 재검합니다.',
        '혈압·지질·체중, eGFR·요알부민/크레아티닌비, 망막·신경·발 상태, 심혈관질환과 저혈당 위험을 확인합니다.'
      ])) +
      card('03 · 혈당 목표', table(['대상 / 지표', '일반적인 목표'], [
        ['2형 성인 HbA1c', '<6.5%'], ['1형 성인 HbA1c', '<7.0%'],
        ['CGM 목표범위 70–180 mg/dL', '범위 내 시간 >70%'],
        ['CGM 저혈당', '<70 mg/dL 시간 <4%; <54 mg/dL 시간 <1%']
      ], '저혈당, 노쇠·인지기능, 동반질환, 기대여명·생활여건에 따라 목표를 개별화합니다. 진단의 ≥6.5%와 치료의 <6.5%는 의미가 다릅니다.')) +
      card('04 · 약물 선택', list([
        '진단 시 생활습관·자기관리 교육과 함께 약물을 검토합니다. 메트포민을 포함해 효과·체중·저혈당·신기능·비용을 비교하고 필요하면 초기 병용합니다.',
        '심부전·CKD는 적응증에 맞는 SGLT2억제제, 죽상경화심혈관질환은 심혈관 이익이 입증된 GLP-1수용체작용제 또는 SGLT2억제제를 우선 고려합니다.',
        '1형은 인슐린이 필수입니다. 체중 감소·다음·다뇨 등 과이화 증상을 동반한 고혈당에서도 인슐린을 시행합니다. 케톤산증은 응급 치료 대상입니다.'
      ])) +
      card('05 · 생활습관', list([
        '과체중·비만이면 체중 5% 이상 감량·유지. 개인별 영양교육으로 총열량·정제 탄수화물·가당음료를 줄이고 섬유질을 늘립니다.',
        '주 150분 이상 중강도 유산소와 주 2–3회 근력운동, 장시간 앉기 중단을 실천합니다. 금연·가능한 금주를 권합니다.'
      ])) +
      card('06 · 추적과 예후', list([
        'HbA1c와 자가/연속혈당을 추적하고 신장·눈·발을 정기 평가합니다. 혈당·혈압·지질의 통합 관리가 합병증 예방의 핵심입니다.',
        '초기 조절은 장기 이득이 있지만 과도한 치료로 저혈당을 만들지 않습니다. 체중 감소로 관해되어도 재발·합병증 추적은 필요합니다.'
      ])) + alert('<strong>응급:</strong> 의식 저하·경련·삼킴 곤란이 있는 저혈당 환자에게 음식을 먹이지 마십시오. 고혈당과 구토·복통·빠른 호흡·탈수가 동반되면 케톤산증 등을 즉시 평가합니다.', true) + sources(dmSources)
    },
    { id: 'ch-lipid', label: '이상지질혈증', title: '이상지질혈증 (고지혈증)', edition: '한국지질·동맥경화학회 2026', lead: 'LDL이 같은 두 사람이라도 심혈관질환과 당뇨병 위험에 따라 목표가 달라집니다.', content:
      card('01 · 검사와 원인 평가', list([
        '총콜레스테롤·LDL-C·HDL-C·중성지방을 평가합니다. 중성지방이 높으면 공복 재검·LDL 측정방법을 확인합니다.',
        '갑상선기능저하·신증후군·담즙정체·조절 불량 당뇨, 음주·약물 같은 이차 원인을 찾습니다. LDL-C ≥190 mg/dL이면 가족성 고콜레스테롤혈증도 평가합니다.',
        '고LDL·고중성지방·혼합형·저HDL로 표현할 수 있습니다. 저HDL 자체를 약물로 올리는 것보다 LDL과 전체 위험 관리가 우선입니다.'
      ])) +
      card('02 · 주요 위험인자', list([
        '연령(남 ≥45세·여 ≥55세), 조기 관상동맥질환 가족력(일촌 남 <55세·여 <65세), 고혈압, 흡연, HDL-C <40 mg/dL.',
        '비만·만성염증·신체활동 부족·임신 합병증 병력, Lp(a)·apoB·hsCRP 등 위험강화인자를 추가 검토합니다. 위험인자를 단순 점수 계산기로 대체하지 않습니다.'
      ])) +
      card('03 · 2026 위험별 LDL / non-HDL 목표', table(['임상 위험 상황', 'LDL-C', 'non-HDL-C'], [
        ['관상동맥질환 / 재발성 죽상경화성 허혈뇌졸중 고위험 / 당뇨 + ASCVD', '<55', '<85'],
        ['죽상경화성 허혈뇌졸중·말초동맥질환·경동맥질환 등 / 고위험 당뇨', '<70', '<100'],
        ['당뇨 <10년 + 주요 위험인자 없음', '<100', '<130'],
        ['주요 위험인자 ≥2개', '<130', '<160'], ['주요 위험인자 ≤1개', '<160', '<190']
      ], '단위 mg/dL. 관상동맥질환·당뇨+ASCVD와 고위험 당뇨 등 해당 군은 기저 LDL 대비 ≥50% 감소도 함께 목표로 합니다. 고위험 당뇨: 유병 ≥10년 또는 주요 위험인자/표적장기손상 동반. 아주 고위험 당뇨의 <55 선택 목표는 전문에서 조건을 확인합니다. 경동맥·대동맥 등 세부 정의와 예외는 원문 참조.', true), true) +
      card('04 · 약물 치료 순서', list([
        '심혈관 위험 평가 → 생활습관 + 스타틴 → 목표 미달이면 최대 내약용량·복약 확인 후 에제티미브, PCSK9억제제 등 추가를 검토합니다.',
        '급성관상동맥증후군은 지질 수치와 무관하게 조기 치료하며, 초기 스타틴·에제티미브 병용도 고려합니다.',
        '중성지방이 매우 높으면 췌장염 예방을 우선하며 이차 원인·금주·식사와 피브레이트/오메가-3 등 적응증을 평가합니다. 임신·수유는 일반 약물 경로를 적용하지 않습니다.'
      ])) +
      card('05 · 생활습관', list([
        '포화지방을 불포화지방으로 대체하고 트랜스지방을 피합니다. 통곡·콩·채소·생선과 식이섬유를 늘리고 가당음료·정제당·과식을 줄입니다.',
        '중성지방 상승이면 특히 금주와 체중 조절. 주 150–300분 중강도 유산소 또는 75–150분 고강도 운동에 근력운동을 병행하고 금연합니다.'
      ])) +
      card('06 · 추적과 예후', list([
        '시작·용량 조정 후 지질반응·복약·근육 증상·간 관련 이상을 재평가합니다. CK는 근육 증상 등 임상 필요에 따라 측정합니다.',
        '예후는 수치 하나보다 누적 LDL 노출과 기존 ASCVD에 좌우됩니다. 목표 달성 뒤에도 임의 중단하지 말고 장기 유지와 재평가가 필요합니다.'
      ])) + sources(lipidSources)
    },
    { id: 'ch-bone', label: '골다공증', title: '골다공증', edition: '공개 국내 권고안 · 2026 전문 미확인', lead: '골밀도 숫자보다 앞으로의 골절 위험과 치료 순서가 중요합니다.', content:
      alert('<strong>최신성 한계:</strong> 대한골대사학회 2026 개정판 발간은 확인했으나 전문이 공개되지 않아 전체 내용을 대조하지 못했습니다. 아래 진단은 대한폐경학회 2024, 치료 위험군은 대한골대사학회 2023 공개 권고안 기준입니다. 2026판을 검토한 최신 완결 지침으로 해석하지 마십시오.') +
      card('01 · DXA 진단과 분류', table(['분류', 'T-score'], [
        ['정상', '≥−1.0'], ['골감소증', '−2.5 초과, −1.0 미만'], ['골다공증', '≤−2.5'], ['심한 골다공증', '골다공증 + 취약골절']
      ], '폐경 후 여성·50세 이상 남성에서는 요추·대퇴골 DXA를 평가합니다. 폐경 전 여성·젊은 남성은 Z-score와 원인을 검토하며 Z≤−2.0만으로 골다공증을 확진하지 않습니다. 취약골절이 있으면 T-score가 −2.5보다 높아도 치료가 필요할 수 있습니다.')) +
      card('02 · 추가 평가', list([
        '골절 부위·시점·낙상, 키 감소·새 요통, 스테로이드와 이차 원인을 확인합니다. 필요 시 척추영상, Ca·신기능·25(OH)D 등을 평가합니다.',
        '한국 FRAX로 10년 주요 골다공증성 골절·고관절 골절 위험을 산정하되 낙상·최근 골절 등 도구가 충분히 반영하지 못하는 요소를 보완합니다.'
      ])) +
      card('03 · 골절 위험별 치료 (폐경 후 여성)', table(['위험군', '대표 기준', '접근'], [
        ['낮음·중등도', '골절 없음 + T>−2.5 + FRAX가 아래 역치 미만', '생활관리·주기적 재평가; 약물은 개별 검토'],
        ['높음', '취약골절 또는 T≤−2.5 또는 FRAX 고관절 ≥3% / 주요 ≥20%', '비스포스포네이트 또는 데노수맙 등'],
        ['매우 높음', '최근 12개월 골절·치료 중 골절·다발 골절·T<−3.0·낙상 고위험 등', '테리파라타이드/로모소주맙 우선 검토 후 골흡수억제제']
      ], '매우 높은 FRAX(고관절 ≥4.5% 또는 주요 ≥30%)도 초고위험 기준. 임상 기준과 국내 급여 기준은 동일하지 않습니다.'), true) +
      card('04 · 약물 안전과 순차치료', list([
        '비스포스포네이트는 신기능·저칼슘·식도질환 및 복용 자세를 확인합니다. 휴약은 기간과 현재 골절위험을 재평가한 뒤 결정합니다.',
        '데노수맙은 임의 지연·중단하면 반동성 골소실·척추골절 위험이 있습니다. 중단 시 후속 골흡수억제제 계획이 필요하며 단순 휴약하지 않습니다.',
        '골형성제 치료 뒤 골흡수억제제로 이득을 유지합니다. 로모소주맙은 심혈관 위험을 검토합니다. 발치 전후 조정은 치과의·처방의가 협의합니다.'
      ])) +
      card('05 · 생활습관과 영양', list([
        '음식으로 충분한 칼슘·단백질을 섭취하고 부족분만 보충합니다. 비타민 D는 결핍·혈중 농도·신기능에 맞춰 조절합니다(치료 환자에서 흔히 800–1,000 IU/일 검토).',
        '체중부하·저항·균형운동과 낙상 환경 개선, 금연·과음 회피를 병행합니다. 척추골절 위험이 높으면 충격·허리 과도한 굴곡 운동을 조정합니다.'
      ])) +
      card('06 · 추적과 예후', list([
        '새 골절·키·낙상·복약·부작용·신기능을 평가하고 동일 장비 DXA 변화를 최소유의변화(LSC)와 함께 해석합니다.',
        '골절 뒤 재골절 위험이 높으므로 조기 치료와 재활이 중요합니다. 골밀도가 좋아져도 과거 골절과 약물 중단 위험이 사라지는 것은 아닙니다.'
      ])) + sources(boneSources)
    }
  ];
  const style = document.createElement('style');
  style.textContent = `
    .tabbtn.chronicTab{border-left:5px solid #087f8c;background:#eaf6f6;color:#164c55}
    .tabbtn.chronicTab.active{background:#087f8c;color:#fff}
    .chronic{--ch-accent:#087f8c;line-height:1.75;padding-bottom:110px}
    .chronic>header{background:linear-gradient(110deg,#edf8f7,#fff);color:#162033;border:1px solid #d7e8e8;border-radius:16px;padding:24px}
    .chronic h2{font-size:30px;letter-spacing:-.045em;margin:8px 0;color:#162033}
    .chronic .ch-kicker{color:#08717e;font-size:13px;font-weight:750;letter-spacing:.04em}
    .chronic .ch-lead{font-size:17px;color:#42566a;margin:10px 0 20px}
    .chronic .ch-meta{display:flex;gap:8px;flex-wrap:wrap;font-size:12px;color:#52667a}
    .chronic .ch-meta span{background:#edf4f7;padding:4px 10px;border-radius:20px}
    .ch-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px;margin:18px 0}
    .ch-card{background:white;border:1px solid #d8e3e8;border-radius:16px;padding:22px;min-width:0}
    .ch-card h3{font-size:19px;letter-spacing:-.025em;margin:0 0 14px;color:#164c55}
    .ch-wide{grid-column:1/-1}.ch-card ul{padding-left:21px;margin:0}.ch-card li+li{margin-top:12px}
    .ch-table{overflow-x:auto;overscroll-behavior-x:contain;border:1px solid #dde7ed;border-radius:10px}
    .ch-table table{margin:0;min-width:420px;font-size:14px;border-collapse:collapse;width:100%}
    .ch-table th,.ch-table td{padding:11px 13px;border-bottom:1px solid #e6edf1;vertical-align:top;line-height:1.65;text-align:left}
    .ch-table thead th{background:#eaf5f5;color:#164c55;position:static}.ch-table tbody th{font-weight:650;background:#f8fafb;width:31%}
    .ch-table tbody tr:last-child>*{border-bottom:0}.ch-note{font-size:13px;color:#526275;margin:12px 0 0}
    .ch-alert{background:#fff7e6;border:1px solid #edcd86;border-left:5px solid #b78320;border-radius:12px;padding:17px 20px;margin:16px 0;grid-column:1/-1}
    .ch-danger{background:#fff0f0;border-color:#e8b3b3;border-left-color:#bd4141;color:#7e2626}
    .ch-sources{padding-left:22px;margin:0;font-size:14px}.ch-sources span{display:block;color:#607080;font-size:13px;margin-top:3px}
    .ch-sources a{overflow-wrap:anywhere}.ch-disclaimer{border-top:1px solid #dbe5ea;padding-top:14px;color:#637385;font-size:12px}
    @media(max-width:1100px){.ch-grid{grid-template-columns:1fr}.chronic h2{font-size:26px}.ch-card{padding:17px}.ch-table table{font-size:13px}}
    @media(max-width:980px){aside .navGroup{display:none}aside{align-items:center}.tabbtn{flex:0 0 auto;width:auto;min-width:0;white-space:nowrap;margin:0;padding:10px 13px}.chronic>header{padding:20px}}
    @media print{.ch-card{break-inside:avoid}.ch-grid{display:block}.ch-card{margin:12px 0}.ch-table{overflow:visible}.ch-table table{min-width:0}.ch-alert{break-inside:avoid}}
  `;
  document.head.appendChild(style);
  const aside = document.querySelector('aside');
  const main = document.querySelector('main');
  if (!aside || !main) return;
  aside.insertAdjacentHTML('afterbegin', `<div class="navGroup">만성질환 · 국내 진료지침</div>${sections.map(s => `<button type="button" class="tabbtn chronicTab" id="nav-${s.id}" data-tab="${s.id}" aria-controls="${s.id}">${s.label}</button>`).join('')}`);
  main.insertAdjacentHTML('beforeend', sections.map(s => `<section class="tab chronic" id="${s.id}" role="tabpanel" aria-labelledby="nav-${s.id}"><header><div class="ch-kicker">ADULT CLINICAL REFERENCE · KOREA</div><h2>${s.title}</h2><div class="ch-meta"><span>${s.edition}</span><span>공개 근거 검토 ${reviewed}</span></div><p class="ch-lead">${s.lead}</p></header><div class="ch-grid">${s.content}</div><p class="ch-disclaimer">임상의 참고용 요약입니다. 의료인의 판단이나 최신 원문·제품 허가사항을 대체하지 않습니다. 임신·소아·응급·특수질환은 별도 지침을 확인하십시오. 환자 정보를 전송하거나 저장하지 않습니다.</p></section>`).join(''));
  // The host's existing tab initializer runs immediately after this script.
  const openHash = () => {
    const id = location.hash.slice(1);
    if (sections.some(s => s.id === id)) document.getElementById(`nav-${id}`).click();
  };
  document.addEventListener('DOMContentLoaded', openHash);
  window.addEventListener('hashchange', openHash);
  document.addEventListener('click', event => {
    const button = event.target.closest('.tabbtn');
    if (!button) return;
    document.querySelectorAll('.tabbtn').forEach(b => b.setAttribute('aria-selected', String(b === button)));
    if (button.classList.contains('chronicTab')) history.replaceState(null, '', `#${button.dataset.tab}`);
    else if (sections.some(s => `#${s.id}` === location.hash)) history.replaceState(null, '', location.pathname + location.search);
  });
})();
