import { escapeHTML as esc } from './core.js';

// Account screens are a UI prototype only: no credentials, sessions or account storage.
export function createAccountUI({ showModal, closeModal, toast }) {
  const views = ['login', 'register', 'center'];
  const labels = { login: '登录', register: '注册', center: '个人中心' };
  let view = 'login';
  let detail = null;
  let demoName = '演示用户';

  function tabs() {
    return `<div class="account-tabs" role="tablist" aria-label="账户原型页面">${views.map(key =>
      `<button type="button" id="account-tab-${key}" role="tab" aria-controls="account-panel" aria-selected="${view === key}" tabindex="${view === key ? '0' : '-1'}" data-account-tab="${key}">${labels[key]}</button>`
    ).join('')}</div>`;
  }

  function authForm() {
    const registering = view === 'register';
    return `<div class="account-form-heading"><div class="account-symbol" aria-hidden="true">禾</div><h3>${registering ? '给每一笔生活，一个归处' : '回来，继续记下生活'}</h3><p>${registering ? '预览创建账户的填写与确认流程。' : '先看看登录与个人中心是否顺手。'}</p></div>
      <form id="account-demo-form" autocomplete="off">
        <label class="form-field">${registering ? '演示昵称' : '演示用户名或邮箱'}<input data-account-name type="text" value="${esc(demoName)}" placeholder="演示用户" maxlength="24" autocomplete="off" spellcheck="false"></label>
        ${registering ? '<label class="form-field">演示邮箱（选填）<input type="text" placeholder="demo@example.com" maxlength="80" autocomplete="off" spellcheck="false" aria-describedby="account-email-note"></label><p id="account-email-note" class="account-field-note">用示例地址体验即可；此处不会校验、发送邮件或保存地址。</p>' : ''}
        <label class="form-field">密码<input type="password" disabled placeholder="原型不输入真实密码" aria-describedby="account-preview-note"></label>
        ${registering ? '<label class="form-field">确认密码<input type="password" disabled placeholder="正式注册时再设置密码"></label>' : '<div class="account-form-tools"><span>本页不会创建登录状态</span><button class="account-text-button" type="button" data-account-action="reset">忘记密码？</button></div>'}
        <button class="button primary account-main-button" type="submit">预览登录后页面</button>
      </form>
      <div class="account-divider"><span>也可以使用微信</span></div>
      <button type="button" class="button account-wechat-button" data-account-action="wechat"><svg viewBox="0 0 28 24" width="22" height="20" aria-hidden="true"><path fill="currentColor" d="M10.8 1C5.4 1 1 4.5 1 8.8c0 2.3 1.3 4.4 3.4 5.8L3.6 18l3.6-1.9c1.1.3 2.3.5 3.6.5h.8a7.7 7.7 0 0 1-.5-2.6c0-4.4 4-7.9 9.1-8.1C18.8 3 15.1 1 10.8 1ZM7.4 6.8a1.2 1.2 0 1 1 0 2.4 1.2 1.2 0 0 1 0-2.4Zm6.7 0a1.2 1.2 0 1 1 0 2.4 1.2 1.2 0 0 1 0-2.4Z"/><path fill="currentColor" d="M20.3 7.5c-4.1 0-7.4 2.8-7.4 6.3s3.3 6.3 7.4 6.3c1 0 1.9-.2 2.8-.5l2.7 1.4-.7-2.7c1.6-1.1 2.6-2.7 2.6-4.5 0-3.5-3.3-6.3-7.4-6.3Zm-2.5 4.1a1 1 0 1 1 0 2 1 1 0 0 1 0-2Zm5 0a1 1 0 1 1 0 2 1 1 0 0 1 0-2Z"/></svg>微信登录 · 查看流程</button>
      <p class="account-bottom-note">${registering ? '注册成功、邮箱验证和密码找回将在正式账户服务接通后提供。' : '没有账户？可切换到上方「注册」预览。'}</p>`;
  }

  function center() {
    return `<div class="account-profile"><div class="account-profile-avatar" aria-hidden="true">${esc([...demoName][0] || '演')}</div><div><span class="account-status">个人中心示例</span><h3>${esc(demoName)}</h3><p>当前没有登录真实账户</p></div></div>
      <div class="account-center-intro">正式版中，每位用户拥有自己的账户空间。账本、资产和预算归属该账户，登录后可在不同设备继续使用。</div>
      <div class="account-capabilities">
        <div><span class="account-feature-icon" aria-hidden="true">▤</span><div><h4>私有账本</h4><p>只查看和管理自己的收支与账本</p></div><span class="account-status">待接通</span></div>
        <div><span class="account-feature-icon" aria-hidden="true">◈</span><div><h4>资产与预算</h4><p>持仓、成本与预算保存在同一账户下</p></div><span class="account-status">待接通</span></div>
        <div><span class="account-feature-icon" aria-hidden="true">⇄</span><div><h4>多设备同步</h4><p>电脑与手机同步使用，当前尚未开启</p></div><span class="account-status">规划中</span></div>
      </div>
      <section class="account-methods" aria-labelledby="account-methods-title"><div class="account-section-heading"><h4 id="account-methods-title">登录与绑定方式</h4><button type="button" class="account-text-button" data-account-action="binding">查看绑定规划</button></div>
        <div class="account-method-row"><span>邮箱与密码</span><span class="account-method-status">未绑定 · 待账户服务</span></div>
        <div class="account-method-row"><span>微信</span><span class="account-method-status">未绑定 · 待微信授权</span></div>
        <p>微信和邮箱将绑定到同一个账户，账本不会拆成两份。</p>
      </section>
      <p class="account-local-note">当前原型数据仍保存在本浏览器，并没有按真实用户隔离或同步。切换这些预览页面不会迁移、删除或上传现有账目。</p>
      <div class="account-center-actions"><button type="button" class="button secondary" data-account-tab="login">返回登录预览</button><button type="button" class="button primary" data-account-action="close">完成预览</button></div>`;
  }

  function detailPage() {
    const pages = {
      wechat: {
        title: '微信登录，将这样使用',
        note: '未接入微信 AppID，未发起授权，也不会显示模拟授权成功。',
        steps: [['点击微信登录', '正式接通后，打开微信官方授权页面。'], ['由你确认授权', '授权结果返回应用，再由账户服务验证。'], ['进入你的账户', '首次使用创建账户；已有账户可在验证后绑定微信。']],
        footer: '这里仅说明流程，不会打开微信或向微信发送数据。'
      },
      reset: {
        title: '忘记密码，也能找回',
        note: '找回密码尚未接通；当前不会发送验证码或修改密码。',
        steps: [['填写已验证的邮箱', '正式版会先确认该地址的找回资格。'], ['验证邮箱归属', '通过邮件中的验证码或一次性链接核验。'], ['设置新密码', '验证通过后再填写新密码，并返回登录。']],
        footer: '原型不用输入真实邮箱、验证码或密码。'
      },
      binding: {
        title: '一个账户，保留所有积累',
        note: '账户绑定是正式版规划，当前没有建立任何身份关联。',
        steps: [['先登录已有账户', '确认账本和资产属于你正在使用的账户。'], ['验证新的登录方式', '添加邮箱时验证邮箱；添加微信时由你授权。'], ['继续使用同一份数据', '邮箱和微信关联到同一账户身份，账本、资产和预算保持归属。']],
        footer: '若微信或邮箱已属于另一个账户，应先说明冲突，再由用户确认处理，不自动合并或覆盖账目。'
      }
    };
    const page = pages[detail];
    return `<div class="account-detail"><h3>${page.title}</h3><p class="account-detail-note">${page.note}</p><ol class="account-steps">${page.steps.map(([title, description]) => `<li><h4>${title}</h4><p>${description}</p></li>`).join('')}</ol><p class="account-local-note">${page.footer}</p><button class="button secondary" type="button" data-account-action="back">返回${view === 'center' ? '个人中心' : view === 'register' ? '注册' : '登录'}预览</button></div>`;
  }

  function render(focusTab = false) {
    showModal('账户与同步 · 原型预览', `<div class="account-preview" id="account-preview">
      <p id="account-preview-note" class="account-preview-notice"><strong>真实注册、微信授权和云端同步尚未接通；请勿输入真实密码。</strong><span>这里用于验收账户页面与操作流程。</span></p>
      ${tabs()}<section id="account-panel" role="tabpanel" aria-labelledby="account-tab-${view}">${detail ? detailPage() : view === 'center' ? center() : authForm()}</section></div>`);
    const root = document.querySelector('#account-preview');
    root.addEventListener('click', event => {
      const button = event.target.closest('button');
      if (!button || !root.contains(button)) return;
      if (views.includes(button.dataset.accountTab)) {
        view = button.dataset.accountTab;
        detail = null;
        render(true);
        return;
      }
      const action = button.dataset.accountAction;
      if (action === 'close') { closeModal(); return; }
      if (['wechat', 'reset', 'binding'].includes(action)) { detail = action; render(); }
      if (action === 'back') { detail = null; render(); }
    });
    root.querySelector('[role="tablist"]').addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const index = views.indexOf(view);
      view = event.key === 'Home' ? views[0] : event.key === 'End' ? views[2] : views[(index + (event.key === 'ArrowRight' ? 1 : -1) + views.length) % views.length];
      detail = null;
      render(true);
    });
    const form = root.querySelector('#account-demo-form');
    if (form) form.addEventListener('submit', event => {
      event.preventDefault();
      demoName = form.querySelector('[data-account-name]').value.trim().slice(0, 24) || '演示用户';
      view = 'center';
      detail = null;
      render(true);
      toast('正在预览个人中心；没有创建账户或登录');
    });
    if (focusTab) root.querySelector(`#account-tab-${view}`).focus();
  }

  return {
    open() {
      view = 'login';
      detail = null;
      demoName = '演示用户';
      render();
    }
  };
}
