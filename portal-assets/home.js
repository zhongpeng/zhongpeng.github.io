(() => {
  const projects = {
    moment: { title: '潮汐之间', kind: '探索游戏', image: './portal-assets/moment-forever.png', alt: '潮汐之间的海岸小岛', description: '在回忆的小岛上散步，从童年走向海岸与山丘。' },
    museum: { title: '木心美术馆', kind: '数字漫游', image: './portal-assets/museum.png', alt: '木心美术馆的三维阶梯阅览厅', description: '循着水光走进展厅，在书墙与钢琴之间停留。' },
    street: { title: '第八巷', kind: '三维街景', image: './portal-assets/street.png', alt: '亮着暖色灯火的第八巷', description: '走进夜色中的小街，推开一扇门，慢慢逛一会儿。' },
    beat: { title: '拍点', kind: '节奏游戏', image: './portal-assets/beat-pocket.png', alt: '拍点音乐节奏游戏', description: '跟着鼓点拍一下。连上每一拍，也给自己加点分。' },
    heye: { title: '禾页账本', kind: '网页体验', image: './portal-assets/heye.png', alt: '禾页账本的虚构示例界面', description: '收支、预算与生活回顾。本机保存，与微信小程序独立。' }
  };
  const rows = [...document.querySelectorAll('[data-preview]')];
  if (!rows.length) return;
  let active = 0;
  const image = document.getElementById('preview-image');
  function show(row) {
    const project = projects[row.dataset.preview];
    if (!project) return;
    active = rows.indexOf(row);
    for (const item of rows) item.dataset.active = String(item === row);
    image.src = project.image;
    image.alt = project.alt;
    document.getElementById('preview-title').textContent = project.title;
    document.getElementById('preview-description').textContent = project.description;
    document.getElementById('preview-kind').textContent = project.kind;
    const art = document.getElementById('preview-art');
    art.href = row.href;
    art.setAttribute('aria-label', `进入${project.title}`);
    document.getElementById('preview-enter').href = row.href;
  }
  for (const row of rows) {
    row.addEventListener('pointerenter', event => { if (event.pointerType !== 'touch') show(row); });
    row.addEventListener('focus', () => show(row));
  }
  document.getElementById('preview-controls').hidden = false;
  document.getElementById('previous').addEventListener('click', () => show(rows[(active - 1 + rows.length) % rows.length]));
  document.getElementById('next').addEventListener('click', () => show(rows[(active + 1) % rows.length]));
})();
