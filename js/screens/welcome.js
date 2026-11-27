import { icons, logo } from "../ui.js";

export function render(root, ctx) {
  root.className = "app gradient-soft center";
  root.innerHTML = `
    <div class="auth">
      <h1 class="title underline" style="align-self:center">Welcome</h1>
      <p class="subtitle">Bill Splitting Calculator</p>
      ${logo}
      <h2 class="title underline" style="align-self:center;font-size:1.6rem">How it works</h2>
      <div class="steps">
        <div class="step">${icons.stepBill}<div><b><span class="num">1</span>Add your bill</b><span class="d">Enter the total amount</span></div></div>
        <div class="step">${icons.stepPeople}<div><b><span class="num">2</span>Add people</b><span class="d">Add friends to split with</span></div></div>
        <div class="step">${icons.stepSplit}<div><b><span class="num">3</span>Split &amp; share</b><span class="d">See who owes what &amp; share the result</span></div></div>
      </div>
      <button class="btn" id="start">Get Started →</button>
      <p class="tagline">• Quick · Fair · Easy •</p>
    </div>`;
  root.querySelector("#start").onclick = () => ctx.go("login");
}
