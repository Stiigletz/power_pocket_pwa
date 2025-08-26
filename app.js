// Power Pocket Calculators — PWA
// Pure computation
class CalcError extends Error {}

function power_factor(p_kw, s_kva){
  if (s_kva <= 0) throw new CalcError("kVA must be > 0");
  if (p_kw < 0) throw new CalcError("kW must be ≥ 0");
  if (p_kw > s_kva) throw new CalcError("kW cannot exceed kVA");
  return p_kw / s_kva;
}
function reactive_power_kvar(s_kva, p_kw){
  if (s_kva <= 0) throw new CalcError("kVA must be > 0");
  if (p_kw < 0) throw new CalcError("kW must be ≥ 0");
  if (p_kw > s_kva) throw new CalcError("kW cannot exceed kVA");
  const val = s_kva**2 - p_kw**2;
  return Math.sqrt(val > 0 ? val : 0);
}
function phase_angle_deg(s_kva, p_kw){
  const pf = Math.min(1, Math.max(0, power_factor(p_kw, s_kva)));
  return (180/Math.PI) * Math.acos(pf);
}
function load_kw_single(volts, amps, pf){
  if (volts <=0) throw new CalcError("Volts must be > 0");
  if (amps <=0) throw new CalcError("Amps must be > 0");
  if (!(pf>=0 && pf<=1)) throw new CalcError("Power factor must be between 0 and 1");
  return volts*amps*pf/1000;
}
function load_kw_three(volts, amps, pf){
  if (volts <=0) throw new CalcError("Volts must be > 0");
  if (amps <=0) throw new CalcError("Amps must be > 0");
  if (!(pf>=0 && pf<=1)) throw new CalcError("Power factor must be between 0 and 1");
  return Math.sqrt(3)*volts*amps*pf/1000;
}

// Controller spec
const CALCS = {
  "Power Factor": {
    inputs: [
      {key:"p_kw", label:"Real Power (kW)", hint:"e.g. 80"},
      {key:"s_kva", label:"Apparent Power (kVA)", hint:"e.g. 100"},
    ],
    compute: d => ({ pf: power_factor(d.p_kw, d.s_kva) }),
    format: r => `PF = ${r.pf.toFixed(4)}`,
  },
  "Reactive Power": {
    inputs: [
      {key:"s_kva", label:"Apparent Power (kVA)", hint:"e.g. 100"},
      {key:"p_kw", label:"Real Power (kW)", hint:"e.g. 80"},
    ],
    compute: d => ({ q: reactive_power_kvar(d.s_kva, d.p_kw) }),
    format: r => `Q = ${r.q.toFixed(3)} kVAr`,
  },
  "Phase Angle": {
    inputs: [
      {key:"s_kva", label:"Apparent Power (kVA)", hint:"e.g. 100"},
      {key:"p_kw", label:"Real Power (kW)", hint:"e.g. 80"},
    ],
    compute: d => ({ theta: phase_angle_deg(d.s_kva, d.p_kw) }),
    format: r => `θ = ${r.theta.toFixed(2)}°`,
  },
  "Ohm's Law": {
    inputs: [
      {key:"volts", label:"Voltage (V)", hint:"e.g. 120 (or blank)"},
      {key:"amps", label:"Current (A)", hint:"e.g. 10 (or blank)"},
      {key:"ohms", label:"Resistance (Ω)", hint:"e.g. 12 (or blank)"},
    ],
    compute: d => {
      let {volts:v, amps:i, ohms:r} = d;
      const known = [v,i,r].filter(x=>!Number.isNaN(x)).length;
      if (known !== 2) throw new CalcError("Provide exactly two of V, I, R");
      if (Number.isNaN(v)) v = i*r;
      else if (Number.isNaN(i)) { if (r===0) throw new CalcError("R must not be 0"); i = v/r; }
      else if (Number.isNaN(r)) { if (i===0) throw new CalcError("I must not be 0"); r = v/i; }
      return {volts:v, amps:i, ohms:r};
    },
    format: r => `V=${r.volts.toFixed(3)} V, I=${r.amps.toFixed(3)} A, R=${r.ohms.toFixed(3)} Ω`,
  },
  "Load (Single-Phase)": {
    inputs: [
      {key:"volts", label:"Volts (V)", hint:"e.g. 480"},
      {key:"amps", label:"Amps (A)", hint:"e.g. 10"},
      {key:"pf", label:"Power Factor (0–1)", hint:"e.g. 0.8"},
    ],
    compute: d => ({ kw: load_kw_single(d.volts, d.amps, d.pf) }),
    format: r => `P = ${r.kw.toFixed(3)} kW`,
  },
  "Load (Three-Phase)": {
    inputs: [
      {key:"volts", label:"Volts (V)", hint:"e.g. 480"},
      {key:"amps", label:"Amps (A)", hint:"e.g. 10"},
      {key:"pf", label:"Power Factor (0–1)", hint:"e.g. 0.8"},
    ],
    compute: d => ({ kw: load_kw_three(d.volts, d.amps, d.pf) }),
    format: r => `P = ${r.kw.toFixed(3)} kW`,
  },
};

// UI
const sel = id => document.getElementById(id);

function populateDropdown(){
  const dd = sel("calc-select");
  dd.innerHTML = "";
  Object.keys(CALCS).forEach(name => {
    const opt = document.createElement("option");
    opt.value = name; opt.textContent = name;
    dd.appendChild(opt);
  });
}

function buildForm(name){
  const spec = CALCS[name];
  const form = sel("form");
  form.innerHTML = "";
  spec.inputs.forEach(inp => {
    const wrapper = document.createElement("div");
    wrapper.style.display = "flex";
    wrapper.style.flexDirection = "column";
    wrapper.style.alignItems = "center";
    wrapper.style.marginBottom = "8px";

    const label = document.createElement("label");
    label.textContent = inp.label;
    wrapper.appendChild(label);

    const el = document.createElement("input");
    el.type = "text";
    el.placeholder = inp.hint;     // e.g. "e.g. 80"
    el.className = "input";
    el.inputMode = "decimal";
    el.autocapitalize = "off";
    el.autocorrect = "off";
    el.dataset.key = inp.key;
    wrapper.appendChild(el);

    form.appendChild(wrapper);
  });
}


function collectInputs(name){
  const spec = CALCS[name];
  const values = {};
  const inputs = sel("form").querySelectorAll("input");
  inputs.forEach(el => {
    const k = el.dataset.key;
    const raw = el.value.replace(/,/g,"").trim();
    const num = raw === "" ? NaN : Number(raw);
    values[k] = num;
  });
  return values;
}

function showResult(text, isError=false){
  const r = sel("result");
  r.textContent = text;
  r.classList.toggle("error", isError);
}

window.addEventListener("load", () => {
  populateDropdown();
  const current = sel("calc-select").value;
  buildForm(current);

  sel("calc-select").addEventListener("change", e => {
    showResult("");
    buildForm(e.target.value);
  });

  sel("compute").addEventListener("click", () => {
    const name = sel("calc-select").value;
    try{
      const parsed = collectInputs(name);
      const out = CALCS[name].compute(parsed);
      showResult(CALCS[name].format(out), false);
    }catch(err){
      if (err instanceof CalcError) showResult(`[error] ${err.message}`, true);
      else showResult(`[unexpected] ${err}`, true);
    }
  });

  sel("clear").addEventListener("click", () => {
    sel("form").querySelectorAll("input").forEach(el => el.value = "");
    showResult("");
  });

  // PWA service worker
  if ("serviceWorker" in navigator){
    navigator.serviceWorker.register("service-worker.js");
  }
});
