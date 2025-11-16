---
marp: true
theme: default
paginate: true
math: katex
style: |
  section {
    background: #0a0a0a;
    color: #ffffff;
    font-size: 1.8rem;
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: 4rem 6rem;
  }
  section h1 { 
    font-size: 5rem; 
    font-weight: 700;
    letter-spacing: -0.03em;
    line-height: 1;
    margin: 0;
    color: #ffffff;
  }
  section h2 { 
    font-size: 4rem; 
    font-weight: 700;
    letter-spacing: -0.03em;
    line-height: 1.1;
    margin: 0;
    color: #ffffff;
  }
  section p {
    font-size: 1.8rem;
    line-height: 1.5;
    opacity: 0.8;
    margin: 1rem 0;
  }
  .accent { color: #00ff88; }
  .hero { font-size: 6rem; font-weight: 800; text-align: center; }
  .subhero { font-size: 2.2rem; opacity: 0.6; text-align: center; margin-top: 2rem; }
  .large { font-size: 7rem; font-weight: 900; text-align: center; margin: 3rem 0; }
  .center { text-align: center; }
  code { background: rgba(0,255,136,0.15); padding: 0.2rem 0.5rem; border-radius: 0.3rem; color: #00ff88; }
---

<!-- _class: lead -->

![bg](source/Slide3.png)

<div class="hero accent">OptiX</div>

<p class="subhero">Smart reallocation across GlueX vaults</p>

<div style="display: flex; justify-content: center; align-items: center; gap: 3rem; margin-top: 4rem; opacity: 0.7;">
  <img src="https://media.licdn.com/dms/image/v2/D4E0BAQGVXY-u225PPQ/company-logo_200_200/B4EZXq5BAMG0AI-/0/1743402570122/gluex_protocol_logo?e=2147483647&v=beta&t=l2pK7SFK2fzTk49dP5wl7V9Qu6njlkd1g7OngC4l-2w" alt="GlueX" height="60" />
  <img src="https://standards.wharton.upenn.edu/wp-content/plugins/martech-chupacabra/includes/images/Wharton-Logo-RGB.png" alt="Wharton" height="60" />
</div>

Yangxinyu Xie, Wharton '25  
Nevan Sujit, Penn '28

---

## The Problem

<br/>

- APY volatility is huge.
- Switching vaults blindly burns yield through costs.

---

<p class="large">What if you knew the <span class="accent">real</span> APY after fees?</p>

---

## OptiX

<br/>

![bg](source/Slide6.png)

Real-time risk-adjusted, cost-aware ranking.

One-click reallocation.

---

## How It Works

<br/>

<p class="center">
<strong>Fetch</strong> vault data<br/><br/>
<strong>Calculate</strong> cost-aware APY<br/><br/>
<strong>Weigh</strong> risk & liquidity<br/><br/>
<strong>Rank</strong> best options<br/><br/>
<strong>Generate</strong> calldata
</p>

---

## Cost-Aware APY

<br/>

$$
\text{APY}_{\text{eff}} = \left[\left(1 + \frac{G - C}{P}\right)^{\frac{365}{H}} - 1\right] \times 100
$$

<p class="center" style="margin-top: 2rem;">Growth minus costs, annualized.</p>

---

## Example

<br/>

$100K position
12% headline APY
$400 switching cost

<p class="large accent">6.6% real APY</p>

---

## Ranking Logic

<br/>

<p class="center" style="font-size: 2rem; line-height: 1.8;">
Cost-aware APY<br/>
<span style="opacity: 0.5;">+</span><br/>
TVL depth<br/>
<span style="opacity: 0.5;">+</span><br/>
Risk assessment
</p>

<p class="center" style="margin-top: 2rem; opacity: 0.6;">
= Your best option
</p>

---

<br/>

<p class="center" style="font-size: 2.5rem;">
Streamlit · Python · GlueX APIs
</p>

---

## What's Next

<br/>

Volatility-aware APY and risk scoring.
Diversified portfolio via mean-variance optimization.
Historical tracking, strategy presets, and alerts.

---

<!-- _class: lead -->

<p class="hero">OptiX</p>

<p class="subhero">Accelerate yield with intelligence.</p>
