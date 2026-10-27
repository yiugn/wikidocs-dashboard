/* Deterministic, local-only adult guideline reference engine. No network, storage or prescribing. */
(function(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ClinicalEngine = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  'use strict';
  const VERSION = '2026-10-27-integrated-1';
  const refs = {
    bp: {name:'대한고혈압학회 2026 제6판 수정본',url:'https://www.koreanhypertension.org/reference/guide?idno=10446&mode=read',section:'52–54쪽 표 10·11, 62–71쪽 권고 8–18, 96·99쪽 감량·추적'},
    dm: {name:'대한당뇨병학회 2025 제9판 최종 전문',url:'https://new.diabetes.or.kr/bbs/?code=guide&mode=view&number=2078&page=1',section:'당뇨병 분류·진단, 혈당조절 목표, 2형당뇨병 약물치료'},
    lipid: {name:'한국지질·동맥경화학회 2026',url:'https://www.lipid.or.kr/reference/guideline.php?boardid=guideline&idx=1456&mode=view',section:'38–44쪽 표 2-3~6, 49–53쪽 시작 기준, 63쪽 추적, 170–172쪽 당뇨병'},
    bone: {name:'대한골대사학회 2023 폐경 후 골다공증 치료전략',url:'https://www.e-jbm.org/upload/pdf/jbm-2023-30-4-289.pdf',section:'290–291쪽 위험군·치료 알고리즘. 2026 비공개 전문 미검토'},
    dxa: {name:'대한폐경학회 골다공증 지침 2024 Part I',url:'https://e-jmm.org/pdf/10.6118/jmm.24000',section:'DXA 해석·T/Z-score·생활관리'},
    frax: {name:'공식 FRAX / FRAXplus',url:'https://www.fraxplus.org/',section:'한국 모델에서 별도 산출. 이 도구는 FRAX 확률을 재현하거나 환자 정보를 전달하지 않음'}
  };
  const numKeys = ['age','height','weight','waist','sbp','dbp','homeSbp','homeDbp','a1c','fpg','ogtt','randomGlucose','dmYears','tc','ldl','hdl','tg','baselineLdl','egfr','uacr','lpa','hscrp','spineT','neckT','hipT','zScore','fraxHip','fraxMajor'];
  const boolKeys = ['htn','hld','dm','predm','osteoporosis','smoking','obesity','familyHtn','familyDm','familyHld','familyEarlyCvd','parentHip','pregnant','menopause','cad','stroke','atheroscleroticStroke','pad','carotid','aaa','hf','af','ckd','egfrChronic','dialysis','hmod','dmOrgan','recurrentStroke','intracranialStenosis','frail','orthostatic','shortLife','bpRepeated','bpLife3','onBp','onLipid','lipidLife','secondaryLipid','onDm','dmRepeat','a1cUnreliable','classicSymptoms','catabolic','hypoglycemia','inflammatory','inactive','earlyMenopause','pregnancyHx','sleepApnea','hiv','acuteChestNeuro','acuteMetabolic','fragility','hipSpineFracture','recentFracture','multipleFracture','fractureOnTherapy','fractureOnHarmDrug','fallRisk','steroids','onBone','denosumab','missedDenosumab'];
  const known = x => x !== null && x !== undefined;
  const any = xs => xs.some(x=>x===true) ? true : xs.every(x=>x===false) ? false : null;
  const fmt = x => Number.isInteger(x) ? String(x) : String(Math.round(x*100)/100);
  const base = (id,name,ref) => ({id,name,status:'info',category:'정보 확인 필요',start:'입력 정보를 확인하십시오.',target:'분류 후 결정',therapy:[],trace:[],missing:[],followup:[],refs:ref,algorithm:''});
  function normalize(input) {
    const p={sex: ['male','female'].includes(input.sex) ? input.sex : null,dmType: ['1','2'].includes(input.dmType) ? input.dmType : null};
    const errors=[];
    for (const k of numKeys) {
      const raw=input[k];
      if (raw===null || raw===undefined || (typeof raw==='string'&&raw.trim()==='')) p[k]=null;
      else {const v=Number(raw);p[k]=Number.isFinite(v)?v:null;if(!Number.isFinite(v))errors.push(k+' 값이 숫자가 아닙니다.');}
      if (known(p[k]) && !['spineT','neckT','hipT','zScore'].includes(k) && p[k]<0)errors.push(k+' 값은 음수일 수 없습니다.');
    }
    for(const k of boolKeys)p[k]=input[k]===true?true:input[k]===false?false:null;
    if(known(p.age) && (!Number.isInteger(p.age)||p.age<18||p.age>120))errors.push('비임신 성인(18–120세) 참고 도구입니다. 나이를 확인하십시오.');
    if(known(p.height)&& (p.height<80||p.height>250))errors.push('키(cm)를 확인하십시오.');
    if(known(p.weight)&&(p.weight<=0||p.weight>500))errors.push('체중(kg)을 확인하십시오.');
    if(known(p.sbp)&&known(p.dbp)&&p.sbp<=p.dbp)errors.push('진료실 수축기혈압은 이완기혈압보다 높아야 합니다.');
    if(known(p.homeSbp)&&known(p.homeDbp)&&p.homeSbp<=p.homeDbp)errors.push('가정 수축기혈압과 이완기혈압을 확인하십시오.');
    if(known(p.a1c)&&(p.a1c<2||p.a1c>25))errors.push('HbA1c(%) 입력값을 확인하십시오.');
    for(const k of ['spineT','neckT','hipT','zScore'])if(known(p[k])&&(p[k]<-10||p[k]>10))errors.push(k+' 점수를 확인하십시오.');
    for(const k of ['fraxHip','fraxMajor'])if(known(p[k])&&p[k]>100)errors.push('FRAX 확률은 0–100%입니다.');
    if(known(p.fraxHip)&&known(p.fraxMajor)&&p.fraxHip>p.fraxMajor)errors.push('FRAX 고관절 확률이 주요 골절 확률보다 큽니다. 입력값을 확인하십시오.');
    if(known(p.baselineLdl)&&p.baselineLdl===0)errors.push('치료 전 LDL은 0보다 커야 합니다.');
    if(p.sex==='male'&&p.pregnant===true)errors.push('성별과 임신 여부 입력을 확인하십시오.');
    if(p.sex==='male'&&p.menopause===true)errors.push('성별과 폐경 여부 입력을 확인하십시오.');
    if(p.dm===false&&p.dmType)errors.push('당뇨병 없음과 당뇨병 유형 선택이 함께 입력되었습니다.');
    if(p.onBone===false&&p.denosumab===true)errors.push('골다공증 약물 없음과 데노수맙 사용이 함께 선택되었습니다.');
    if(p.ckd===false&&p.dialysis===true)errors.push('만성콩팥병 없음과 만성 유지투석이 함께 선택되었습니다.');
    if(known(p.tc)&&known(p.hdl)&&p.tc<p.hdl)errors.push('총콜레스테롤은 HDL보다 작을 수 없습니다. 검사값을 확인하십시오.');
    if(p.onDm===true&&p.dm===false)errors.push('당뇨병 없음과 혈당강하 치료 중이 함께 선택되었습니다.');
    p.bmi=known(p.height)&&known(p.weight)?p.weight/(p.height/100)**2:null;
    return {p,errors};
  }
  function context(p) {
    const positives=[];
    if(p.a1cUnreliable!==true && known(p.a1c)&&p.a1c>=6.5)positives.push('HbA1c '+fmt(p.a1c)+'% ≥6.5%');
    if(known(p.fpg)&&p.fpg>=126)positives.push('공복혈당 '+fmt(p.fpg)+' ≥126');
    if(known(p.ogtt)&&p.ogtt>=200)positives.push('75 g 부하 2시간 '+fmt(p.ogtt)+' ≥200');
    const symptomatic=known(p.randomGlucose)&&p.randomGlucose>=200&&p.classicSymptoms===true;
    const dm=p.dm===true||p.onDm===true||positives.length>=2||(positives.length>=1&&p.dmRepeat===true)||symptomatic?true:positives.length?null:p.dm;
    const pre=p.predm===true||(p.a1cUnreliable!==true&&known(p.a1c)&&p.a1c>=5.7&&p.a1c<6.5)||(known(p.fpg)&&p.fpg>=100&&p.fpg<126)||(known(p.ogtt)&&p.ogtt>=140&&p.ogtt<200)?true:p.predm;
    const ckd=p.ckd===true||p.dialysis===true||(p.egfrChronic===true&&known(p.egfr)&&p.egfr<60)?true:p.ckd;
    const hmod=p.hmod===true||(known(p.uacr)&&p.uacr>=30)?true:p.hmod;
    const dmOrgan=p.dmOrgan===true||(known(p.uacr)&&p.uacr>=30)||(ckd===true&&known(p.egfr)&&p.egfr<60)?true:p.dmOrgan;
    const vascular=any([p.atheroscleroticStroke,p.pad,p.carotid,p.aaa]);
    const ascvd=any([p.cad,vascular]);
    const clinical=any([p.cad,p.stroke,p.hf,p.af,p.pad,p.aaa,ckd]);
    return {dm,pre,ckd,hmod,dmOrgan,vascular,ascvd,clinical,positives,symptomatic};
  }
  function counts(p,c,kind) {
    const r={min:0,max:0,trace:[],missing:[]};
    function add(label,state,points=1) {
      if(state===true){r.min+=points;r.max+=points;r.trace.push(label+' +'+points);}
      else if(state===false)r.trace.push(label+' 0');
      else{r.max+=points;r.trace.push(label+' 미확인 (0–'+points+')');r.missing.push(label);}
    }
    let age=null;
    if(known(p.age))age=p.age>=55?true:p.age<45?false:p.sex==='male'?true:p.sex==='female'?false:null;
    add('연령',age,kind==='bp'&&(!known(p.age)||p.age>=65)?2:1);
    add('조기 심뇌혈관/관상동맥 가족력',p.familyEarlyCvd);
    add('흡연',p.smoking);
    if(kind==='bp') {
      const obese=(known(p.bmi)&&p.bmi>=25)||(known(p.waist)&&p.sex&&p.waist>=(p.sex==='male'?90:85))?true:p.obesity;
      add('비만·복부비만(중복 1개)'+(known(p.bmi)?' BMI '+fmt(p.bmi):'')+(known(p.waist)?' / 허리 '+p.waist+' cm':''),obese);
      const vals=[['tc',240,'ge'],['ldl',160,'ge'],['hdl',40,'lt'],['tg',200,'ge']];
      const lipid=p.hld===true?true:any(vals.map(([k,v,op])=>known(p[k])?(op==='ge'?p[k]>=v:p[k]<v):null));
      add('이상지질혈증(중복 1개)',lipid);
      if(c.dm===true)add('당뇨병(전단계 중복 안 함)',true,2);
      else if(c.dm===false)add('당뇨병 전단계',c.pre);
      else{const lower=c.pre===true?1:0;r.min+=lower;r.max+=2;r.trace.push('당대사 상태 미확인 ('+lower+'–2)');r.missing.push('당뇨병/전단계 확인');}
    } else {
      const elevated=(known(p.sbp)&&p.sbp>=140)||(known(p.dbp)&&p.dbp>=90);
      add('고혈압 또는 항고혈압제 복용',p.htn===true||p.onBp===true||(elevated&&p.bpRepeated===true)?true:elevated?null:p.htn);
      add('HDL <40',known(p.hdl)?p.hdl<40:null);
      if(known(p.hdl)&&p.hdl>=60&&p.hdl<=100){r.min=Math.max(0,r.min-1);r.max=Math.max(0,r.max-1);r.trace.push('HDL 60–100: −1개 감산');}
      else if(known(p.hdl)&&p.hdl>100)r.trace.push('HDL >100: 감산하지 않음');
      else if(!known(p.hdl)){r.min=Math.max(0,r.min-1);r.trace.push('HDL 미입력: 보호인자 감산 가능성도 미확정');}
    }
    return r;
  }
  function bpGrade(s,d) {
    if(!known(s)||!known(d))return null;
    if(s>=160||d>=100)return 4;
    if(s>=140||d>=90)return 3;
    if(s>=130||d>=80)return 2;
    if(s>=120)return 1;
    return 0;
  }
  const gradeNames=['정상 범주','주의혈압','고혈압 전단계','1기 범주','2기 범주'];
  function bloodPressure(p,c,urgent) {
    const r=base('bp','고혈압',[refs.bp]);const n=counts(p,c,'bp');r.score=n;
    r.trace.push(...n.trace);r.missing.push(...n.missing);
    const g=bpGrade(p.sbp,p.dbp);
    r.algorithm='진료실 혈압 단계 → 위험인자 가중 개수(≥65세·당뇨는 각각 2개) → 장기손상/임상질환 우선 분류 → 약물 시작 조건 → 목표·유지 평가. 가족의 고혈압 자체는 조기 심뇌혈관질환 가족력 점수와 다릅니다.';
    r.followup=['약 시작·조정 후 2–4주, 안정적 목표 도달 후 3–6개월 추적. 신기능·전해질과 가정혈압 확인.'];
    if(g===null){r.category='진료실 혈압 입력 필요';r.missing.push('수축기·이완기혈압 모두');return r;}
    r.category=gradeNames[g]+(p.onBp===true?' (치료 중 현재 수치)':' (측정값 기준)');
    if(p.htn===true)r.category='고혈압 진단 병력 · '+r.category;
    r.trace.push('진료실 '+p.sbp+'/'+p.dbp+' mmHg → '+gradeNames[g]);
    if(p.bpRepeated!==true){r.missing.push('표준화 반복 측정·확진 여부');r.trace.push('단회/미확인 측정: 고혈압 확진으로 단정하지 않음');}
    const ranks=new Set();
    const matrix=(row,grade)=>grade<2?[0]:grade===2?(row===0?[0]:row===1?[1,2]:row===2?[2,3]:[3]):grade===3?(row===0?[1]:row===1?[2]:[3]):row===0?[2,3]:[3];
    if(c.clinical===true)ranks.add(3);
    else{
      for(let i=n.min;i<=n.max;i++)for(const rank of matrix(c.hmod===true?2:i>=3?2:i>=1?1:0,g))ranks.add(rank);
      if(c.hmod===null)for(const rank of matrix(2,g))ranks.add(rank);
      if(c.clinical===null)ranks.add(3);
    }
    const names=['최저위험','저위험','중위험','고위험'];const sorted=[...ranks].sort();
    r.risk=sorted.map(x=>names[x]).join(' / ');r.trace.push('가중 개수 '+n.min+(n.min===n.max?'':'–'+n.max)+' + 장기손상/임상질환 → '+r.risk);
    if(g<2&&c.clinical!==true){r.risk='정상/주의혈압: 전단계 이상 위험도 행렬의 직접 적용 범위 밖';r.trace[r.trace.length-1]='위험인자 가중 개수 '+n.min+(n.min===n.max?'':'–'+n.max)+'개를 기록하되 정상/주의혈압을 행렬상 최저위험으로 단정하지 않음';}
    if(c.hmod===null)r.missing.push('무증상 장기손상 유무');if(c.clinical===null)r.missing.push('심뇌혈관질환·CKD 병력');
    if(c.hmod===true)r.trace.push('장기손상 기준 반영: 확인 병력 또는 요알부민/크레아티닌비 '+(known(p.uacr)?p.uacr+' mg/g':'미입력'));
    if(c.ckd===true)r.trace.push('확인된 CKD 병력 또는 ≥3개월 지속 저하 eGFR 반영');
    else if(known(p.egfr)&&p.egfr<60)r.missing.push('eGFR <60의 지속 기간·CKD 확진 (단회 값만으로 확정 안 함)');
    let target=null;
    if(p.frail===true||p.orthostatic===true||p.shortLife===true||(known(p.age)&&p.age>=85))r.target='개별화 필요: 노쇠·증상·기대여명에 따라 과도한 강압 회피';
    else {
      const strict=c.dm===true||c.ckd===true||c.hmod===true||c.clinical===true||n.min>=3;
      const lowCertain=n.max<3&&c.clinical===false&&c.hmod===false&&c.dm===false;
      if(strict){target=[130,80];r.target='진료실 <130/80 mmHg (내약성·예외 확인)';}
      else if(lowCertain){target=[140,90];r.target='진료실 <140/90 mmHg';}
      else r.target='위험도 미확정: 중·저위험 <140/90, 고위험·당뇨 등 <130/80';
      if(p.stroke===true&&p.intracranialStenosis===true){target=[140,90];r.target='두개내 동맥 협착 동반 뇌경색: 진료실 <140/90 mmHg (급성기 별도)';r.trace.push('뇌졸중 + 확인된 두개내 협착 예외 적용');}
      else if(p.stroke===true&&p.intracranialStenosis===null){r.target+='; 두개내 협착 동반 뇌경색은 <140/90 예외 확인';r.missing.push('두개내 동맥 협착 동반 뇌경색 여부');}
    }
    if(target)r.trace.push('선택된 표준 목표 '+target[0]+'/'+target[1]+' 미만; 뇌졸중 특수조건·노쇠 미확인 시 최종 개별화');
    const confirmed=p.bpRepeated===true?'':'반복 측정으로 확인된다면: ';
    if(urgent)r.start='급성 증상 평가가 우선입니다. 일반 외래 시작·증량 알고리즘을 적용하지 마십시오.';
    else if(p.onBp===true){
      const atTarget=target&&p.sbp<target[0]&&p.dbp<target[1];
      r.start=atTarget?'현재 표준 목표 범위: 치료·생활요법 유지 및 안전성 확인':'치료 중: 목표·복약·백의효과 확인 후 조정 검토 (임의 증량 금지)';
      r.trace.push('항고혈압제 사용 중이므로 신규 개시 대신 유지/조정 경로 적용');
    } else if(g>=4)r.start=confirmed+'생활요법과 약물치료를 신속히 병행 (I/A)';
    else if((p.frail===true||(known(p.age)&&p.age>=80))&&g===3)r.start='노쇠/≥80세: 수축기 ≥160에서 병행 권고. 140–159는 내약성·동반질환에 따라 개별 결정';
    else if(g===3&&sorted[0]>=2)r.start=confirmed+'1기 중·고위험: 초기부터 생활요법 + 약물 (I/A)';
    else if(g===3&&sorted.length===1&&sorted[0]===1)r.start=confirmed+'1기 저위험: 생활요법 우선 가능; 효과 부족·새 위험인자·추적 어려움이면 조기 약물 검토';
    else if(g===3)r.start='1기 범주이나 위험정보 부족: 중·고위험이면 초기 약물, 확실한 저위험이면 생활요법 우선 가능';
    else if(g===2&&any([p.cad,p.pad,p.aaa,p.hf])===true)r.start='전단계 + 해당 심혈관질환: 생활요법과 약물치료 고려 (IIa/B)';
    else if(g===2&&any([c.dm,c.ckd,c.hmod])===true)r.start=p.bpLife3===true?'전단계 고위험 + 생활요법 3개월 후에도 ≥130/80: 약물 고려 가능 (IIb/B)':'전단계 고위험: 약 3개월 생활요법 후에도 ≥130/80이면 약물 검토';
    else r.start='생활요법·가정혈압·위험인자 관리. 이 수치만으로 일괄 신규 투약하지 않음';
    if(known(p.age)&&p.age>=65&&p.age<80&&p.frail===false&&p.sbp>=140&&p.onBp!==true)r.start=confirmed+'건강한 ≥65세: 생활요법과 약물 병행 (I/A)';
    if(known(p.homeSbp)&&known(p.homeDbp)){
      const oh=p.sbp>=140||p.dbp>=90,hh=p.homeSbp>=135||p.homeDbp>=85;
      r.trace.push('가정 평균 '+p.homeSbp+'/'+p.homeDbp+' → '+(oh&&!hh?'백의효과 가능: 지속성 고혈압 확진/증량 전 확인':!oh&&hh?'가면 고혈압/가면 비조절 가능: 진료실 정상만으로 안심하지 않음':'진료실·가정 혈압 함께 검토'));
      if(!oh&&hh)r.start='가면 고혈압/가면 비조절 가능: 활동혈압 등 확인 후 위험기반 치료 검토';
    }
    if((p.sbp>=180||p.dbp>=110)&&!urgent)r.start='심한 혈압 상승: 조속한 의료평가로 장기손상 확인. 집에서 급격히 낮추거나 자동 증량하지 않음';
    if(p.sbp<110||p.dbp<70)r.followup.push('낮은 혈압·기립 증상·관류 상태 확인. 숫자 하나로 일률 중단하지 않음.');
    r.therapy=['ACE억제제/ARB·칼슘차단제·이뇨제 등은 동반질환·신기능·K·임신 여부에 맞춰 의료진이 선택합니다.','목표 도달은 완치나 자동 중단 기준이 아닙니다.'];
    if(p.onBp===null){r.missing.push('현재 항고혈압제 사용 여부');r.start='약물 사용 여부 미확인: 신규 개시와 치료 중 조정 경로를 구분해야 합니다. '+r.start;}
    r.status=urgent?'danger':g>=4?'warn':r.missing.length?'pending':'info';return r;
  }
  function diabetes(p,c) {
    const r=base('dm','당뇨병',[refs.dm]);
    r.algorithm='검사별 진단 역치 → 기존 진단/전형적 증상/동일 평가기간의 두 종류 검사/반복검사 조건 → 유형 → 저혈당·노쇠 → HbA1c 목표와 동반질환 중심 치료. 나이·체형만으로 1형/2형을 추정하지 않습니다.';
    for(const [key,label] of [['a1c','HbA1c(%)'],['fpg','공복혈당'],['ogtt','75 g 부하 2시간'],['randomGlucose','무작위 혈당']])if(known(p[key]))r.trace.push(label+' '+fmt(p[key]));
    if(p.a1cUnreliable!==false)r.trace.push('빈혈·수혈·혈색소 이상 등 HbA1c 신뢰도 확인'+(p.a1cUnreliable===true?': HbA1c를 진단 분류에서 제외':''));
    r.trace.push('진단범위 검사 '+c.positives.length+'종: '+(c.positives.join(', ')||'확인된 양성 기준 없음'));
    if(c.symptomatic)r.trace.push('무작위 혈당 ≥200 + 전형적 증상 조건 충족');
    if(c.dm===true){
      r.category=p.dm===true?'기존 당뇨병 진단'+(p.dmType?' · '+p.dmType+'형':' · 유형 미확인'):p.onDm===true?'당뇨병 치료 중 (진단·유형 확인)':'당뇨병 진단 기준에 해당하는 입력 (의료진 확진·유형 확인)';
      if(!p.dmType)r.missing.push('1형/2형·기타 원인 감별');
      const individualized=any([p.frail,p.hypoglycemia,p.shortLife])===true;
      const goal=p.dmType==='1'?7:p.dmType==='2'?6.5:null;
      r.target=individualized?'저혈당·노쇠·기대여명에 맞춰 개별화; 일반 수치 목표를 자동 적용하지 않음':goal?'일반 HbA1c <'+goal+'% (개별화 필요)':'유형 확인 후: 2형 일반 <6.5%, 1형 일반 <7.0%';
      if(p.dmType==='1')r.start='인슐린 치료가 필수인 유형: 유지·용량은 전문 평가. 임의 중단 금지';
      else if(p.catabolic===true)r.start='체중 감소·다음·다뇨 등 과이화 증상 + 고혈당: 인슐린 포함 치료를 신속히 평가';
      else if(!p.dmType)r.start='유형과 임상 상태를 확인한 뒤 약물 선택. 이 결과만으로 경구약/인슐린을 확정하지 않음';
      else if(!known(p.a1c))r.start='HbA1c·자가혈당·현재 치료를 확인하여 생활요법과 약물 시작/조정 결정';
      else if(individualized)r.start='개별 목표와 저혈당 위험을 먼저 정하고 약물 강도 조정';
      else if(p.onDm===true)r.start=p.a1c<goal?'현재 일반 목표 범위: 저혈당 없이 유지되는지 평가':'일반 목표 미달: 복약·식사·약물 강화 평가';
      else if(p.a1c-goal>=1.5)r.start='2형 기준 목표보다 HbA1c가 ≥1.5%p 높음: 초기 병용요법 검토';
      else r.start='2형 당뇨병: 진단 시 생활요법·자기관리 교육과 약물치료를 함께 검토';
      if(any([p.hf,c.ckd])===true)r.therapy.push('심부전/CKD: 이익이 입증된 SGLT2억제제 등 검토; eGFR·제품별 허가 확인.');
      if(c.ascvd===true)r.therapy.push('ASCVD: 심혈관 이익이 입증된 GLP-1수용체작용제 또는 SGLT2억제제 우선 검토.');
      if(known(p.egfr)&&p.egfr<30)r.therapy.push('eGFR <30: 메트포민 사용 제한 및 다른 약제의 신기능별 조건을 반드시 확인.');
      r.followup.push('혈당·HbA1c, 저혈당, eGFR·요알부민, 망막·발·혈압·지질을 함께 추적.');
    } else if(['fpg','ogtt','randomGlucose'].some(k=>known(p[k])&&p[k]<70)){r.category='낮은 혈당 관찰 · 정상 혈당으로 분류하지 않음';r.start='측정값·증상·동반 약물 및 저혈당 원인을 신속히 확인';r.target='저혈당 교정·재발 예방 및 원인 평가';}
    else if(c.positives.length){r.category='당뇨병 의심 · 확진 조건 미충족/미확인';r.start='서로 다른 날 반복검사 등 확진 조건과 증상·유형 확인을 우선';r.target='확진 후 유형별 목표 설정';r.missing.push('반복검사 또는 다른 종류 검사·증상 확인');}
    else if(known(p.randomGlucose)&&p.randomGlucose>=200){r.category='무작위 고혈당 · 확진 평가 필요';r.start='전형적 증상 유무와 공복혈당·HbA1c 등 정식 검사를 확인';r.missing.push('무작위 고혈당의 증상·확진 검사');}
    else if(c.pre===true){r.category='당뇨병 전단계에 해당하는 입력/병력';r.start='식사·운동·체중관리와 정기 재검. 예방약은 별도 고위험 평가';r.target='당뇨병 진행 예방; 과체중이면 체중 ≥5% 감량·유지 검토';}
    else if(known(p.fpg)||known(p.ogtt)||(known(p.a1c)&&p.a1cUnreliable!==true)){r.category='입력된 유효 검사에서 진단 역치 미만';r.start='다른 검사·임상 맥락과 선별검사 필요성 확인';r.target='예방·체중·생활습관 관리';r.trace.push('일부 정상 검사만으로 모든 당대사 이상을 배제하지 않음');}
    else {r.category='당대사 검사 정보 부족';r.missing.push('HbA1c·공복혈당·OGTT 또는 기존 진단');}
    if((known(p.age)&&p.age>=35)||(known(p.age)&&p.age>=19&&any([p.familyDm,p.obesity,p.htn,p.hld,c.ascvd])===true))r.followup.push('선별검사 대상: 정상 선별 결과도 매년 재검 권고.');
    if(p.familyDm===true)r.trace.push('당뇨 가족력은 선별·예방 위험요인이지 당뇨병 확진 근거가 아님');
    if(known(p.a1c)&&p.a1cUnreliable===null)r.missing.push('HbA1c 신뢰도·해석 제한 여부');
    if(c.dm===true&&p.onDm===null)r.missing.push('현재 당뇨병 약물치료 여부');
    r.status=r.missing.length?'pending':c.dm===true?'warn':'info';return r;
  }
  function lipid(p,c) {
    const r=base('lipid','이상지질혈증',[refs.lipid]);const n=counts(p,c,'lipid');r.score=n;r.trace.push(...n.trace);r.missing.push(...n.missing);
    if(known(p.ldl))r.trace.push('현재 LDL '+p.ldl+' mg/dL');
    r.algorithm='기존 관상/혈관질환·당뇨를 먼저 분류 → 주요 위험인자 5종 및 HDL 60–100 감산 → 추가 위험강화인자 → 일반 시작 기준/선택적 구간 → 절대 LDL·non-HDL 목표 및 필요한 감소율 → 유지 평가. 고혈압의 가중점수를 재사용하지 않습니다.';
    let code='unknown',goal=null,half=false,optional=false;
    const enhanced=any([p.obesity,p.inactive,p.inflammatory,p.earlyMenopause,p.pregnancyHx,p.sleepApnea,p.hiv,(known(p.bmi)?p.bmi>=25:null),(known(p.lpa)?p.lpa>=50:null),(known(p.hscrp)?p.hscrp>=2:null)]);
    if(p.cad===true||(c.dm===true&&c.ascvd===true)){code='A';goal=55;half=true;r.category='관상동맥질환 / 당뇨 + ASCVD';}
    else if(c.vascular===true){code='B';goal=70;half=true;r.category='비심장성 혈관질환군';if(p.recurrentStroke===true)optional=true;}
    else if(c.dm===true){
      if((known(p.dmYears)&&p.dmYears>=10)||n.min>=1||c.dmOrgan===true){code='C';goal=70;half=true;r.category='고위험 당뇨병군';optional=c.dmOrgan===true||n.min>=3;}
      else if(known(p.dmYears)&&p.dmYears<10&&n.max===0&&c.dmOrgan===false){code='D';goal=100;r.category='유병 <10년·주요 위험인자/장기손상 없는 당뇨병군';}
      else{r.category='당뇨병군: 위험 세분류 정보 부족';r.missing.push('당뇨 유병기간·주요 위험인자·장기손상');}
    } else if(c.dm===false&&c.ascvd===false){
      if(n.min>=2){code='E';goal=130;r.category='중등도 위험군';}
      else if(n.max<=1){code='F';goal=160;r.category='저위험군';}
      else {r.category='저위험~중등도: 주요 위험인자 정보 부족';}
    } else {r.category='상위 위험군 확인 필요';r.missing.push('당뇨·기존 ASCVD 병력 확인');}
    if(code!=='A' && (p.cad===null||c.vascular===null||c.dm===null)){r.missing.push('상위 위험군을 배제할 병력');r.category+=' (확인된 최소 분류)';}
    if(goal){r.target='LDL <'+goal+' mg/dL; non-HDL <'+(goal+30)+' mg/dL'+(half?'; 치료 전 대비 ≥50% 감소도 동시 목표':'');if(optional)r.target+='; 매우 높은 위험에서 LDL <55 선택적 강화 검토';}
    else r.target='분류 미확정: 위험군에 따라 LDL <55 / <70 / <100 / <130 / <160';
    r.trace.push('주요 위험인자 '+n.min+(n.min===n.max?'':'–'+n.max)+'개 → '+r.category);
    if(enhanced===true)r.trace.push('위험강화인자 있음: 주요 위험인자 점수에 더하지 않고 목표 강화·재분류에 사용');
    if(p.familyHld===true)r.trace.push('고지혈증 가족력: 가족성 질환 평가에 참고. 조기 관상동맥 가족력 점수와 별개');
    if(!known(p.ldl)){r.missing.push('현재 LDL');r.start='LDL과 현재 치료 여부를 확인하여 시작/유지 판단';}
    else if(p.onLipid===true){r.start=goal&&p.ldl<goal?'현재 절대 LDL 목표 범위: 위험·감소율·내약성을 확인하며 유지':'치료 중 목표·복약·용량·병용 평가';r.trace.push('현재 LDL '+p.ldl+': 약물로 낮아진 수치를 치료 전 값처럼 해석하지 않음');}
    else if(p.secondaryLipid===true)r.start='이차 원인 확인·교정 및 임상 위험에 따른 약물치료를 의료진이 결정';
    else if(p.ldl>=190)r.start='LDL ≥190: 이차 원인 확인·교정 후 원인 없으면 위험점수와 무관하게 스타틴. 가족성 질환 평가';
    else if(code==='A')r.start='이차예방 약물치료를 적극 검토. LDL이 낮다는 이유만으로 제외하지 않음';
    else if(['B','C'].includes(code))r.start=p.ldl>=70?'LDL ≥70: 약물치료 검토':p.ldl>=55?'55–69: 전체 위험·강화 목표에 따라 선택적 약물 검토':'현재 수치와 전체 위험을 검토; 기존 적응증은 별도';
    else if(code==='D')r.start=p.ldl>=100?'LDL ≥100: 약물치료 권고':p.ldl>=70?'70–99: 추가 위험·강화 목표에 따라 선택적 고려':'생활요법·추적 및 전체 위험 평가';
    else if(['E','F'].includes(code)){
      const threshold=code==='E'?130:160,lower=code==='E'?100:130;
      r.start=p.ldl>=threshold?(p.lipidLife===true?'생활요법 시행 후에도 ':'수주–수개월 생활요법 후에도 ')+ 'LDL ≥'+threshold+'이면 스타틴 '+(code==='E'?'고려 (IIa/B)':'고려 가능 (IIb/B)'):p.ldl>=lower&&enhanced===true?'일반 시작 기준 미만이나 위험강화인자 있음: 재분류·더 낮은 목표 및 약물 선택적 검토':'일반 시작 기준 미만: 생활요법·추적 (다른 위험·적응증 확인)';
    } else r.start='정보 부족: 저위험으로 가정하지 않고 위험군부터 확인';
    if(known(p.ldl)&&known(p.baselineLdl)&&p.baselineLdl>0){const reduction=(p.baselineLdl-p.ldl)/p.baselineLdl*100;r.reduction=reduction;r.trace.push('LDL 감소율 ('+p.baselineLdl+'−'+p.ldl+')/'+p.baselineLdl+'×100 = '+fmt(reduction)+'%'+(half&&reduction<50?' → ≥50% 목표 미달':''));if(p.onLipid===true&&half&&reduction<50)r.start='절대 LDL 목표와 별도로 ≥50% 감소 목표 미달: 복약·치료 강도 평가';}
    else if(half)r.missing.push('치료 전 LDL (≥50% 감소율 평가)');
    if(known(p.tc)&&known(p.hdl))r.trace.push('non-HDL = '+p.tc+'−'+p.hdl+' = '+fmt(p.tc-p.hdl)+' mg/dL');
    if(known(p.tg)&&p.tg>=500){r.therapy.push('TG ≥500: 췌장염 위험·이차 원인·음주·혈당 및 별도 약물 평가. LDL 경로와 분리.');r.status='warn';}
    if(c.ckd===true)r.therapy.push('CKD는 별도 지질 치료 경로도 적용. 특히 투석에서 스타틴 신규 시작을 이 표로 자동 결정하지 않음.');
    if(p.onLipid===null){r.missing.push('현재 지질강하제 사용 여부');r.start='치료 중인지 확인한 뒤 신규 개시/유지 경로를 선택하십시오. '+r.start;}
    if(p.dialysis===true){r.target+='; 유지투석은 일반 LDL 목표 적용을 개별화';if(p.onLipid!==true)r.start='만성 유지투석: 이 일반 위험군 표로 스타틴 신규 시작을 자동 권고하지 않습니다. ASCVD·기존 치료·신장 전문 평가를 확인하십시오.';}
    r.therapy.push('스타틴 중심 치료 후 목표 미달이면 최대 내약성·에제티미브·PCSK9 등 병용을 의료진이 검토. 용량 처방은 하지 않음.');
    r.followup=['시작/조정 후 4–12주 지질·내약성, 이후 3–12개월. 근육·간 관련 이상은 조기 상담.','목표 도달만으로 약물을 임의 중단하지 않음.'];
    if(r.status!=='warn')r.status=r.missing.length?'pending':'info';return r;
  }
  function bone(p) {
    const r=base('bone','골다공증',[refs.bone,refs.dxa,refs.frax]);
    r.algorithm='성별·폐경·나이로 T/Z-score 적용 범위 확인 → 유효 DXA 부위의 최저 T-score → 취약골절·최근/다발/치료 중 골절·낙상 → 입력된 공식 FRAX → 확인된 최소 위험군 → 약물·순차치료 검토. FRAX를 임의 공식으로 생성하지 않습니다.';
    const ts=[p.spineT,p.neckT,p.hipT].filter(known),t=ts.length?Math.min(...ts):null;
    if(known(t))r.trace.push('유효 DXA 최저 T-score '+fmt(t));else r.missing.push('유효 DXA T-score');
    const eligible=p.sex==='female'&&p.menopause===true||p.sex==='male'&&known(p.age)&&p.age>=50;
    r.trace.push('T-score 진단 적용 '+(eligible?'범위':'여부 확인/범위 외'));
    const fracture=any([p.fragility,p.hipSpineFracture,p.recentFracture,p.multipleFracture,p.fractureOnTherapy,p.fractureOnHarmDrug]);
    if(!eligible){
      r.category=known(p.zScore)&&p.zScore<=-2?'연령 기대치보다 낮은 골밀도 (Z≤−2)':'T-score 단독 분류를 적용하지 않음';
      r.start='폐경 여부·나이·이차 원인·골절을 평가. 젊은 성인에게 T-score만으로 확진·투약하지 않음';r.target='골절 예방·원인 질환 교정';
      if(!p.sex)r.missing.push('성별');if(p.sex==='female'&&p.menopause===null)r.missing.push('폐경 여부');
      if(fracture===true)r.start='취약골절 있음: 전문 평가로 원인 및 치료 필요성 검토';
      r.status='pending';return r;
    }
    const diagnosis=known(t)?t<=-2.5?'골다공증 DXA 기준':t<-1?'골감소증 DXA 범주':'정상 DXA 범주':'DXA 미입력';
    r.category=diagnosis+(p.osteoporosis===true?' · 기존 진단 병력 있음':'');
    if(p.sex==='male'){
      r.start=known(t)&&t<=-2.5||fracture===true?'약물치료 필요성 평가. 남성용 허가·적응증·이차 원인을 확인':'DXA·골절·임상 위험 평가 후 치료 판단';
      r.risk='남성: 폐경 후 여성의 2023 위험군/약물 순서를 자동 적용하지 않음';r.target='골절 예방·골밀도 유지·낙상 예방';r.status='pending';
    } else {
      const veryReasons=[];for(const [key,label] of [['recentFracture','최근 12개월 취약골절'],['multipleFracture','다발 골절'],['fractureOnTherapy','골다공증 치료 중 골절'],['fractureOnHarmDrug','골 손상 약물 사용 중 골절'],['fallRisk','낙상 고위험']])if(p[key]===true)veryReasons.push(label);
      if(known(t)&&t<-3)veryReasons.push('T-score <−3.0');
      if(known(p.fraxHip)&&p.fraxHip>=4.5)veryReasons.push('FRAX 고관절 ≥4.5%');if(known(p.fraxMajor)&&p.fraxMajor>=30)veryReasons.push('FRAX 주요 골절 ≥30%');
      const highReasons=[];if(fracture===true)highReasons.push('취약골절');if(known(t)&&t<=-2.5)highReasons.push('T-score ≤−2.5');
      if(known(p.fraxHip)&&p.fraxHip>=3)highReasons.push('FRAX 고관절 ≥3%');if(known(p.fraxMajor)&&p.fraxMajor>=20)highReasons.push('FRAX 주요 골절 ≥20%');
      const required=['fragility','hipSpineFracture','recentFracture','multipleFracture','fractureOnTherapy','fractureOnHarmDrug','fallRisk'];
      const missingFlags=required.filter(k=>p[k]===null);
      const fraxComplete=known(p.fraxHip)&&known(p.fraxMajor);
      if(veryReasons.length){r.risk='매우 높은 골절위험 (공개 2023 권고안)';r.trace.push(...veryReasons);r.start='골형성제 우선 전략(테리파라타이드/로모소주맙)과 후속 골흡수억제제 검토';r.status='warn';}
      else if(highReasons.length){r.risk='확인된 최소 고위험';r.trace.push(...highReasons);r.start='비스포스포네이트/데노수맙 등 약물치료 검토; 초고위험 여부 추가 확인';r.status=missingFlags.length?'pending':'warn';}
      else if(known(t)&&fraxComplete&&!missingFlags.length&&fracture===false){r.risk=t<-1?'중등도 위험':'낮은 위험';r.start='생활·낙상 예방 및 주기적 재평가. 약물은 개별 검토';r.status='info';}
      else{r.risk='최종 골절위험 미확정';r.start='골절·낙상·DXA 및 필요 시 공식 FRAX를 보완한 뒤 치료 결정';r.status='pending';}
      if(missingFlags.length)r.missing.push('최근/다발/치료 중 골절·낙상 등 미확인 항목');
      if(!fraxComplete)r.missing.push('공식 한국 FRAX (선택적 추가 평가; 고위험 확정에 항상 필요한 것은 아님)');
      r.target='골절 예방·골밀도 유지/개선·낙상 감소; 일률적 T-score 목표로 약물을 중단하지 않음';
    }
    if(p.parentHip===true||p.steroids===true)r.trace.push('부모 고관절골절/스테로이드 위험 확인: FRAX·이차성 골다공증 평가에 반영, 임의 점수 가산 안 함');
    if(known(p.fraxHip))r.trace.push('입력 FRAX 고관절 '+p.fraxHip+'%');if(known(p.fraxMajor))r.trace.push('입력 FRAX 주요 골절 '+p.fraxMajor+'%');
    if(p.onBone===true||p.denosumab===true)r.start='치료 중: 새 골절·순응도·현재 약제·이전 순서를 재평가하여 유지/변경 결정. 초치료 권고를 그대로 적용해 약물을 바꾸지 마십시오.';
    else if(p.osteoporosis===true)r.start='기존 골다공증 진단 근거·과거 골절·이전 치료를 먼저 확인. 현재 골밀도 개선만으로 진단 소멸이나 치료 불필요로 단정하지 않습니다. '+r.start;
    if(p.denosumab===true)r.therapy.push('데노수맙은 임의 휴약/중단하지 않음. 중단 시 후속 골흡수억제제 계획 필요.');
    if(p.missedDenosumab===true){r.therapy.push('데노수맙 투여 지연/중단 계획: 처방 의료진과 신속히 상의.');r.status='warn';}
    r.therapy.push('2026 개정판 비공개 전문은 미검토. 2023 공개 권고안·2024 국내 공개 지침 기반 참고이며 허가·급여와 별개.');
    r.followup=['골절·키 감소·낙상·복약·Ca/비타민 D·신기능, 동일 장비 DXA와 최소유의변화(LSC) 평가.'];return r;
  }
  function evaluate(input={}) {
    const {p,errors}=normalize(input);const alerts=[];
    const glucose=['fpg','ogtt','randomGlucose'].map(k=>p[k]).filter(known);
    const severeLow=glucose.some(x=>x<54),severeHigh=glucose.some(x=>x>=600);
    const urgent=p.acuteChestNeuro===true||p.acuteMetabolic===true||severeLow||severeHigh;
    if(severeLow)alerts.push('혈당 <54 mg/dL 입력: 즉각적인 저혈당 대응·의료평가가 필요합니다. 의식 저하·삼킴 곤란이면 음식을 먹이지 말고 응급 도움을 요청하십시오.');
    else if(glucose.some(x=>x<70))alerts.push('혈당 <70 mg/dL: 낮은 혈당을 확인하고 증상·약물·원인을 신속히 평가하십시오.');
    if(severeHigh)alerts.push('혈당 ≥600 mg/dL 입력: 측정값 확인과 응급 의료평가가 우선입니다. 고삼투압 상태 등은 별도 검사가 필요합니다.');
    else if(glucose.some(x=>x>=300))alerts.push('현저한 고혈당(≥300 mg/dL): 조속한 의료진 평가가 필요합니다. 구토·탈수·의식 변화·과호흡이 있으면 응급 평가하십시오.');
    if(p.acuteChestNeuro===true)alerts.push('현재 흉통·호흡곤란·새 신경학적 이상: 수치와 무관하게 응급 평가가 우선입니다.');
    if(p.acuteMetabolic===true)alerts.push('현재 의식 저하·심한 저혈당 증상 또는 구토·복통·과호흡·탈수: 응급 평가가 우선입니다.');
    if(errors.length)return {version:VERSION,errors,alerts,results:[]};
    if(p.pregnant===true)return {version:VERSION,errors:[],alerts:[...alerts,'임신 중에는 일반 비임신 성인 알고리즘을 적용하지 않습니다. 임신 고혈압·당뇨·약물 안전성에 대한 별도 평가가 필요합니다.'],results:[]};
    if(p.pregnant===null)alerts.push('임신 여부 미확인: 약물 선택 전 확인하십시오.');
    if(!known(p.age)||!p.sex)alerts.push('나이·성별이 부족합니다. 연령 위험인자와 골밀도 적용 범위는 미확정으로 표시합니다.');
    const c=context(p);const results=[bloodPressure(p,c,urgent),diabetes(p,c),lipid(p,c),bone(p)];
    if(urgent)for(const r of results){r.status='danger';r.start='응급 임상평가 우선. 아래 일반적인 외래 알고리즘으로 치료를 결정하지 마십시오.';}
    for(const r of results)r.missing=[...new Set(r.missing)];
    return {version:VERSION,errors:[],alerts,bmi:p.bmi,results};
  }
  return {VERSION,refs,numKeys,boolKeys,evaluate,bpGrade,normalize};
});
