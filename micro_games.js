(function () {
  const config = window.SHIA_GAME_CONFIG;
  if (!config) return;

  const mount = document.querySelector("#gameMount");
  const message = document.querySelector("#message");
  const scoreEl = document.querySelector("#score");
  const goalEl = document.querySelector("#goal");
  const timeEl = document.querySelector("#time");
  const startButton = document.querySelector("#startButton");
  const resetButton = document.querySelector("#resetButton");

  const setText = (el, value) => {
    if (el) el.textContent = value;
  };

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  function makeButton(text, className = "micro-choice") {
    const button = document.createElement("button");
    button.type = "button";
    button.className = className;
    button.textContent = text;
    return button;
  }

  function laneGame() {
    let lane = 1;
    let itemLane = 0;
    let y = -80;
    let score = 0;
    let time = config.time || 35;
    let speed = config.speed || 180;
    let running = false;
    let last = performance.now();

    mount.innerHTML = `
      <div class="micro-stage">
        <div class="micro-board" id="board">
          <div class="micro-lanes"><div class="micro-lane"></div><div class="micro-lane"></div><div class="micro-lane"></div></div>
          <div class="micro-item" id="item"></div>
          <div class="micro-player" id="player"></div>
        </div>
        <div class="micro-row" id="laneControls"></div>
      </div>
    `;
    const board = mount.querySelector("#board");
    const item = mount.querySelector("#item");
    const player = mount.querySelector("#player");
    const laneControls = mount.querySelector("#laneControls");

    ["左", "中央", "右"].forEach((label, index) => {
      const button = makeButton(label);
      button.addEventListener("click", () => setLane(index));
      laneControls.append(button);
    });

    function setLane(value) {
      lane = clamp(value, 0, 2);
      [...laneControls.children].forEach((button, index) => button.classList.toggle("active", index === lane));
      render();
    }

    function nextItem() {
      itemLane = Math.floor(Math.random() * 3);
      y = -80;
      speed += 5;
    }

    function render() {
      const width = board.clientWidth || 1;
      player.style.left = `${(lane + 0.5) * width / 3}px`;
      item.style.left = `${(itemLane + 0.5) * width / 3}px`;
      item.style.transform = `translate(-50%, ${y}px)`;
      item.textContent = config.item || "★";
      player.textContent = config.player || "▰";
      setText(scoreEl, score);
      setText(goalEl, config.avoid ? "避ける" : "集める");
      setText(timeEl, Math.max(0, Math.ceil(time)));
    }

    function loop(now) {
      const delta = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (running) {
        time -= delta;
        y += speed * delta;
        const hitY = board.clientHeight - 80;
        if (y >= hitY) {
          if (itemLane === lane) {
            if (config.avoid) {
              score = Math.max(0, score - 15);
              message.textContent = config.hitMessage || "当たりました";
            } else {
              score += 20;
              message.textContent = config.goodMessage || "キャッチ";
            }
          } else if (config.avoid) {
            score += 8;
            message.textContent = config.goodMessage || "回避";
          } else {
            message.textContent = config.missMessage || "見逃しました";
          }
          nextItem();
        }
        if (time <= 0) {
          running = false;
          time = 0;
          message.textContent = `終了。スコアは${score}です`;
        }
        render();
      }
      requestAnimationFrame(loop);
    }

    function start() {
      lane = 1;
      score = 0;
      time = config.time || 35;
      speed = config.speed || 180;
      running = true;
      nextItem();
      setLane(1);
      message.textContent = config.startMessage || "開始";
    }

    function reset() {
      running = false;
      lane = 1;
      score = 0;
      time = config.time || 35;
      speed = config.speed || 180;
      nextItem();
      setLane(1);
      message.textContent = "スタートで開始";
    }

    startButton.addEventListener("click", start);
    resetButton.addEventListener("click", reset);
    window.addEventListener("keydown", (event) => {
      if (event.key === "ArrowLeft" || event.key === "a") setLane(lane - 1);
      if (event.key === "ArrowRight" || event.key === "d") setLane(lane + 1);
    });
    reset();
    requestAnimationFrame(loop);
  }

  function stackGame() {
    let score = 0;
    let time = 40;
    let running = false;
    let x = 0;
    let direction = 1;
    let width = 180;
    let baseLeft = 0;
    let layers = [];
    let last = performance.now();

    mount.innerHTML = `<div class="stack-stage" id="stackStage"></div>`;
    const stage = mount.querySelector("#stackStage");

    function render() {
      stage.innerHTML = "";
      const stageWidth = stage.clientWidth || 1;
      layers.forEach((layer, index) => {
        const piece = document.createElement("div");
        piece.className = "stack-piece";
        piece.style.width = `${layer.width}px`;
        piece.style.left = `${layer.left}px`;
        piece.style.bottom = `${index * 36 + 8}px`;
        piece.style.background = layer.color;
        stage.append(piece);
      });
      if (running) {
        const moving = document.createElement("div");
        moving.className = "stack-piece";
        moving.style.width = `${width}px`;
        moving.style.left = `${x}px`;
        moving.style.bottom = `${layers.length * 36 + 8}px`;
        moving.style.background = config.colors[layers.length % config.colors.length];
        stage.append(moving);
      }
      setText(scoreEl, score);
      setText(goalEl, `${layers.length}段`);
      setText(timeEl, Math.max(0, Math.ceil(time)));
      if (stageWidth && !layers.length) baseLeft = (stageWidth - width) / 2;
    }

    function drop() {
      if (!running) return;
      const previous = layers[layers.length - 1] || { left: baseLeft, width };
      const left = Math.max(x, previous.left);
      const right = Math.min(x + width, previous.left + previous.width);
      const overlap = right - left;
      if (overlap < 28) {
        running = false;
        message.textContent = `崩れました。${score}点`;
        render();
        return;
      }
      width = overlap;
      layers.push({ left, width, color: config.colors[(layers.length + 1) % config.colors.length] });
      score += Math.round(overlap / 4) + layers.length * 6;
      x = 0;
      direction = 1;
      message.textContent = "次を重ねてください";
      render();
    }

    function loop(now) {
      const delta = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (running) {
        time -= delta;
        x += direction * (180 + layers.length * 12) * delta;
        const max = Math.max(0, stage.clientWidth - width);
        if (x <= 0) {
          x = 0;
          direction = 1;
        }
        if (x >= max) {
          x = max;
          direction = -1;
        }
        if (time <= 0) {
          running = false;
          time = 0;
          message.textContent = `終了。${layers.length}段積みました`;
        }
        render();
      }
      requestAnimationFrame(loop);
    }

    function start() {
      score = 0;
      time = 40;
      running = true;
      width = 180;
      layers = [];
      x = 0;
      message.textContent = "タイミングよく重ねてください";
      render();
    }

    startButton.addEventListener("click", start);
    resetButton.addEventListener("click", start);
    mount.addEventListener("click", drop);
    window.addEventListener("keydown", (event) => {
      if (event.code === "Space") {
        event.preventDefault();
        drop();
      }
    });
    render();
    requestAnimationFrame(loop);
  }

  function threatGame() {
    let score = 0;
    let flame = 5;
    let time = 35;
    let active = -1;
    let running = false;
    let timer = null;

    mount.innerHTML = `
      <div class="micro-stage">
        <div class="sort-item" id="flame">🔥</div>
        <div class="micro-row" id="threatButtons"></div>
      </div>
    `;
    const flameEl = mount.querySelector("#flame");
    const buttonsWrap = mount.querySelector("#threatButtons");
    ["左の風", "上の風", "右の風", "下の風"].forEach((label, index) => {
      const button = makeButton(label, "micro-action");
      button.addEventListener("click", () => clearThreat(index));
      buttonsWrap.append(button);
    });

    function render() {
      setText(scoreEl, score);
      setText(goalEl, `炎${flame}`);
      setText(timeEl, Math.max(0, Math.ceil(time)));
      flameEl.textContent = flame > 3 ? "🔥" : flame > 1 ? "🕯" : "💨";
      [...buttonsWrap.children].forEach((button, index) => button.classList.toggle("active", index === active));
    }

    function clearThreat(index) {
      if (!running) return;
      if (index === active) {
        score += 12;
        active = -1;
        message.textContent = "風を止めました";
      } else {
        flame = Math.max(0, flame - 1);
        message.textContent = "違う方向です";
      }
      render();
    }

    function tick() {
      if (!running) return;
      time -= 0.8;
      if (active >= 0) flame -= 1;
      active = Math.floor(Math.random() * 4);
      if (flame <= 0 || time <= 0) {
        running = false;
        clearInterval(timer);
        message.textContent = flame <= 0 ? `消えました。${score}点` : `守り切りました。${score}点`;
      }
      render();
    }

    function start() {
      clearInterval(timer);
      score = 0;
      flame = 5;
      time = 35;
      active = -1;
      running = true;
      message.textContent = "光った風を押してください";
      timer = setInterval(tick, 800);
      render();
    }

    startButton.addEventListener("click", start);
    resetButton.addEventListener("click", start);
    render();
  }

  function hopGame() {
    let score = 0;
    let life = 3;
    let target = 1;
    let round = 0;
    let running = false;

    mount.innerHTML = `
      <div class="micro-stage">
        <div class="sort-item" id="moonTarget">🌙</div>
        <div class="micro-row" id="moonButtons"></div>
      </div>
    `;
    const moonTarget = mount.querySelector("#moonTarget");
    const buttonsWrap = mount.querySelector("#moonButtons");
    ["左の月", "中央の月", "右の月"].forEach((label, index) => {
      const button = makeButton(label);
      button.addEventListener("click", () => choose(index));
      buttonsWrap.append(button);
    });

    function next() {
      target = Math.floor(Math.random() * 3);
      round += 1;
      moonTarget.textContent = ["↙ 🌙", "↑ 🌙", "🌙 ↘"][target];
      [...buttonsWrap.children].forEach((button, index) => button.classList.toggle("active", index === target));
    }

    function render() {
      setText(scoreEl, score);
      setText(goalEl, `残り${life}`);
      setText(timeEl, round);
    }

    function choose(index) {
      if (!running) return;
      if (index === target) {
        score += 15 + round;
        message.textContent = "着地成功";
      } else {
        life -= 1;
        message.textContent = "月を踏み外しました";
      }
      if (life <= 0) {
        running = false;
        message.textContent = `終了。スコアは${score}です`;
      } else {
        next();
      }
      render();
    }

    function start() {
      score = 0;
      life = 3;
      round = 0;
      running = true;
      message.textContent = "光った月へジャンプ";
      next();
      render();
    }

    startButton.addEventListener("click", start);
    resetButton.addEventListener("click", start);
    start();
  }

  function connectGame() {
    const points = [
      [18, 72], [32, 28], [54, 66], [68, 22], [84, 78]
    ];
    let order = [];
    let step = 0;
    let score = 0;

    mount.innerHTML = `<div class="node-board" id="nodeBoard"></div>`;
    const board = mount.querySelector("#nodeBoard");

    function shuffle(items) {
      const copy = [...items];
      for (let i = copy.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      return copy;
    }

    function render() {
      board.innerHTML = "";
      points.forEach(([x, y], index) => {
        const button = document.createElement("button");
        button.className = "node-button";
        button.type = "button";
        button.textContent = order.indexOf(index) + 1;
        button.style.left = `${x}%`;
        button.style.top = `${y}%`;
        button.classList.toggle("done", order.indexOf(index) < step);
        button.addEventListener("click", () => choose(index));
        board.append(button);
      });
      setText(scoreEl, score);
      setText(goalEl, `${step + 1}/${order.length}`);
      setText(timeEl, "順番");
    }

    function choose(index) {
      if (index === order[step]) {
        step += 1;
        score += 20;
        message.textContent = "接続";
        if (step >= order.length) {
          score += 60;
          message.textContent = "回路完成";
          newRound();
          return;
        }
      } else {
        score = Math.max(0, score - 10);
        step = 0;
        message.textContent = "順番が違います";
      }
      render();
    }

    function newRound() {
      order = shuffle([0, 1, 2, 3, 4]);
      step = 0;
      render();
    }

    startButton.addEventListener("click", newRound);
    resetButton.addEventListener("click", () => {
      score = 0;
      newRound();
    });
    newRound();
  }

  function sorterGame() {
    const items = config.items;
    let current = items[0];
    let score = 0;
    let time = 40;
    let running = false;
    let timer = null;

    mount.innerHTML = `
      <div class="micro-stage">
        <div class="sort-item" id="sortItem"></div>
        <div class="micro-row" id="sortButtons"></div>
      </div>
    `;
    const itemEl = mount.querySelector("#sortItem");
    const buttonsWrap = mount.querySelector("#sortButtons");
    config.bins.forEach((bin) => {
      const button = makeButton(bin.label);
      button.addEventListener("click", () => choose(bin.key));
      buttonsWrap.append(button);
    });

    function nextItem() {
      current = items[Math.floor(Math.random() * items.length)];
      itemEl.textContent = current.icon;
    }

    function render() {
      setText(scoreEl, score);
      setText(goalEl, current.label);
      setText(timeEl, Math.max(0, Math.ceil(time)));
    }

    function choose(key) {
      if (!running) return;
      if (key === current.bin) {
        score += 12;
        message.textContent = "仕分け成功";
      } else {
        score = Math.max(0, score - 8);
        message.textContent = "箱が違います";
      }
      nextItem();
      render();
    }

    function tick() {
      time -= 0.25;
      if (time <= 0) {
        running = false;
        clearInterval(timer);
        message.textContent = `終了。スコアは${score}です`;
      }
      render();
    }

    function start() {
      clearInterval(timer);
      score = 0;
      time = 40;
      running = true;
      nextItem();
      message.textContent = "正しい箱を選んでください";
      timer = setInterval(tick, 250);
      render();
    }

    startButton.addEventListener("click", start);
    resetButton.addEventListener("click", start);
    nextItem();
    render();
  }

  function timingGame() {
    let position = 0;
    let direction = 1;
    let score = 0;
    let time = config.time || 35;
    let speed = 0.7;
    let running = false;
    let last = performance.now();

    mount.innerHTML = `
      <div class="micro-stage">
        <div class="timing-track" id="timingTrack">
          <div class="timing-zone"></div>
          <div class="timing-marker" id="timingMarker"></div>
        </div>
        <button class="primary-btn" id="judgeButton" type="button">${config.actionLabel || "押す"}</button>
      </div>
    `;
    const marker = mount.querySelector("#timingMarker");
    const judgeButton = mount.querySelector("#judgeButton");

    function render() {
      marker.style.left = `${position * 100}%`;
      setText(scoreEl, score);
      setText(goalEl, "中央");
      setText(timeEl, Math.max(0, Math.ceil(time)));
    }

    function judge() {
      if (!running) return;
      const distance = Math.abs(position - 0.5);
      if (distance < 0.045) {
        score += 30;
        message.textContent = "ぴったり";
      } else if (distance < 0.11) {
        score += 12;
        message.textContent = "成功";
      } else {
        score = Math.max(0, score - 6);
        message.textContent = "早いか遅いです";
      }
      speed += 0.025;
      render();
    }

    function loop(now) {
      const delta = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (running) {
        time -= delta;
        position += direction * speed * delta;
        if (position <= 0) {
          position = 0;
          direction = 1;
        }
        if (position >= 1) {
          position = 1;
          direction = -1;
        }
        if (time <= 0) {
          running = false;
          time = 0;
          message.textContent = `終了。スコアは${score}です`;
        }
        render();
      }
      requestAnimationFrame(loop);
    }

    function start() {
      position = 0;
      direction = 1;
      score = 0;
      time = config.time || 35;
      speed = 0.7;
      running = true;
      message.textContent = "中央で押してください";
      render();
    }

    startButton.addEventListener("click", start);
    resetButton.addEventListener("click", start);
    judgeButton.addEventListener("click", judge);
    window.addEventListener("keydown", (event) => {
      if (event.code === "Space") {
        event.preventDefault();
        judge();
      }
    });
    render();
    requestAnimationFrame(loop);
  }

  function routeGame() {
    const path = config.path || ["right", "right", "down", "down", "right", "down"];
    let step = 0;
    let score = 0;
    let pos = { x: 0, y: 0 };
    const labels = { up: "上", down: "下", left: "左", right: "右" };
    const moves = {
      up: [0, -1],
      down: [0, 1],
      left: [-1, 0],
      right: [1, 0]
    };

    mount.innerHTML = `
      <div class="micro-stage">
        <div class="route-grid" id="routeGrid"></div>
        <div class="micro-row" id="routeButtons"></div>
      </div>
    `;
    const grid = mount.querySelector("#routeGrid");
    const buttons = mount.querySelector("#routeButtons");
    ["up", "left", "right", "down"].forEach((dir) => {
      const button = makeButton(labels[dir]);
      button.addEventListener("click", () => choose(dir));
      buttons.append(button);
    });

    function renderGrid() {
      grid.innerHTML = "";
      for (let y = 0; y < 5; y += 1) {
        for (let x = 0; x < 5; x += 1) {
          const cell = document.createElement("div");
          cell.className = "route-cell";
          cell.textContent = x === pos.x && y === pos.y ? "旗" : "";
          cell.classList.toggle("active", x === pos.x && y === pos.y);
          cell.classList.toggle("goal", x === 4 && y === 4);
          grid.append(cell);
        }
      }
      setText(scoreEl, score);
      setText(goalEl, labels[path[step]] || "宝");
      setText(timeEl, `${step}/${path.length}`);
    }

    function choose(dir) {
      if (dir === path[step]) {
        const [dx, dy] = moves[dir];
        pos.x = clamp(pos.x + dx, 0, 4);
        pos.y = clamp(pos.y + dy, 0, 4);
        step += 1;
        score += 20;
        if (step >= path.length) {
          message.textContent = `宝に到着。${score}点`;
          step = 0;
          pos = { x: 0, y: 0 };
        } else {
          message.textContent = "地図通りです";
        }
      } else {
        score = Math.max(0, score - 8);
        message.textContent = "地図と違う方向です";
      }
      renderGrid();
    }

    function start() {
      step = 0;
      score = 0;
      pos = { x: 0, y: 0 };
      message.textContent = "表示された方向へ進んでください";
      renderGrid();
    }

    startButton.addEventListener("click", start);
    resetButton.addEventListener("click", start);
    start();
  }

  const modes = {
    lane: laneGame,
    stack: stackGame,
    threat: threatGame,
    hop: hopGame,
    connect: connectGame,
    sorter: sorterGame,
    timing: timingGame,
    route: routeGame
  };

  const start = modes[config.mode];
  if (start) start();
}());
