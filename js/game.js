var SAVE_KEY = "karabako-game";
var CHARGE_LINE = "告発は、署の机から出せる。";
var SOLUTION = "二十時五十分に届いた写真の電子レンジは、十九時八分を指しています。二分進んでいたので、写っているのは十九時六分です。右下の「金」は、十九時ちょうどから十九時十分までの天気にしか出ません。二十時五十分のドラマには出ません。この写真は、二十時五十分に部屋にいたことにはなりません。三〇五が東門を出たのは二十時四十二分、戻ったのは二十時五十四分です。宅配ボックスは西の入口の内側で、二十時四十一分に八秒開いただけです。中身は十六時二十分に取り終わっています。西の入口に、その時間の三〇五はありません。十二分のうち、橋までの往復は四分です。二十時四十四分に着き、二十時五十二分に出れば、二十時五十四分に東門へ戻ります。太一家までの往復は十分で、二十時四十六分の「送らないで」には間に合いません。呼び出しの画像は、白い柵と、その左の自販機です。見取り図でその景色なのは、歩道橋です。通話は二つに分かれています。千春側は室内で、二十時四十五分のニュースが入っています。太一側は外の風です。二十時四十六分、太一側に女の人の「送らないで」があります。同じ分、風呂では裕子と莉奈が名前を呼び合っています。絵里香は自宅から風呂の連絡を送り、冬美の三〇六は東門を出ていません。千春は受話の側です。橋にいられる女の人は、夏希だけです。足音は一つです。後頭部の傷は幅十八ミリ、厚さ十二ミリで、中に緑色の油があります。この断面は、空気入れの軸だけです。軸に地面の擦り傷はなく、自転車は金具のある側を上にして倒れています。倒れたときに軸が付いていれば、地面を擦ります。外して一度打ち、金具へ戻して、転倒に見せています。二十時四十七分の打撃のあと、太一は画面を押せません。二十時四十九分の「もう来るな」は、現場にいた人が残しています。正樹の拳は二十時五分のもので、二十時四十四分には太一はまだ話しています。正樹は二十時四十八分、橋と反対の酒屋にいます。時計をどちらへずらしても、二十時五分の太一家と、二十時四十七分の橋と、酒屋の会計は揃いません。動機は、呼び出しの件です。来なければ二十一時に、今開いている連絡へ送る、と再び呼ばれたので、夏希はそれを止めるために太一を殺しました。";
var CORE = ["chihiro", "natsu", "masaki"];
var REFS = ["yusuke", "rina", "shinji", "yuko"];
var MISSIONS = [
  { id: "refs", title: "参考人を呼ぶ", text: "原稿を書いていた祐介、莉奈、慎司、裕子を署に呼ぶ。" },
  { id: "check", title: "話を確かめる", text: "冬美と絵里香に、前夜の居場所を聞く。" },
  { id: "neighbors", title: "周囲を回る", text: "太一家の前と、団地の向かいを回る。" }
];
var FILE_ORDER = [
  "family", "map", "draft", "summons", "chihiro-line", "three", "threat",
  "past", "rina-chihiro", "tanaka-home", "call", "gate", "photo", "store", "autopsy"
];

function fresh() {
  return {
    started: false,
    phase: "night",
    view: "night",
    viewId: "",
    round: 1,
    seen: {},
    marks: {},
    memo: "",
    hints: 0,
    log: [],
    queue: [],
    banner: "",
    closed: false,
    solved: false,
    lastSpot: "",
    ink: [],
    inks: {},
    admin: false
  };
}

function load() {
  try {
    var saved = JSON.parse(localStorage.getItem(SAVE_KEY) || "");
    if (saved && saved.seen && saved.log) {
      if (!saved.ink) saved.ink = [];
      if (!saved.inks || typeof saved.inks !== "object") saved.inks = {};
      saved.admin = !!saved.admin;
      saved.banner = "";
      saved.queue = [];
      return saved;
    }
  } catch (e) {}
  return fresh();
}

var state = load();
var inkTool = "look";
var INK_COLORS = [
  { id: "#e23b3b", label: "赤" },
  { id: "#f0c84a", label: "黄" },
  { id: "#4aa3ff", label: "青" },
  { id: "#ffffff", label: "白" }
];
var pick = { who: [], none: false, alibi: "", trick: "" };
var step = "who";
var answerSteps = ["who", "alibi", "trick", "confirm", "result"];

function save() {
  localStorage.setItem(SAVE_KEY, JSON.stringify(state));
}

function personById(id) {
  return STORY.people.filter(function (person) { return person.id === id; })[0];
}

function fileById(id) {
  return STORY.files.filter(function (file) { return file.id === id; })[0];
}

function spotById(id) {
  return STORY.spots.filter(function (spot) { return spot.id === id; })[0];
}

function heard(id, round) {
  return !!state.seen["talk:" + id + ":" + round];
}

function phoneOpened() {
  return !!state.seen["spot:phone"];
}

function autopsyRead() {
  return !!state.seen["file:autopsy"];
}

function fileSeen(id) {
  return !!state.seen["file:" + id];
}

function coreDone() {
  return CORE.every(function (id) { return heard(id, 1); });
}

function missionOn(id) {
  return !!state.seen["mission:" + id];
}

function openMissions() {
  if (!coreDone()) return [];
  return MISSIONS.filter(function (mission) { return !missionOn(mission.id); });
}

function recordsReady() {
  return coreDone()
    && REFS.every(function (id) { return heard(id, 1); })
    && heard("fuyumi", 1)
    && heard("erika", 1)
    && heard("neighbors", 1);
}

function availablePeople() {
  if (state.phase !== "day") return [];
  var ids = ["chihiro"];
  if (phoneOpened()) ids.push("natsu", "masaki");
  if (missionOn("refs")) ids.push("yusuke", "rina", "shinji", "yuko");
  if (missionOn("check")) ids.push("fuyumi", "erika");
  if (missionOn("neighbors")) ids.push("neighbors");
  return ids.map(personById);
}

function availableRounds(person) {
  var rounds = [1];
  var id = person.id;
  if (!person.rounds[2]) return rounds;
  if (id === "natsu" && heard("fuyumi", 1) && fileSeen("gate")) rounds.push(2);
  if (id === "masaki" && heard("erika", 1) && heard("neighbors", 1) && fileSeen("store")) rounds.push(2);
  if (id === "chihiro" && heard(id, 1) && autopsyRead() && fileSeen("call")) rounds.push(2);
  if (["yusuke", "rina", "shinji", "yuko"].indexOf(id) !== -1 && heard(id, 1) && autopsyRead()) rounds.push(2);
  return rounds;
}

function availableFileIds() {
  if (state.phase !== "day") return [];
  var ids = ["family", "map"];
  if (phoneOpened()) ids.push("draft");
  if (heard("natsu", 1)) ids.push("summons");
  if (heard("chihiro", 1)) ids.push("chihiro-line");
  if (heard("yuko", 1) || heard("rina", 1)) ids.push("three");
  if (heard("natsu", 2)) ids.push("threat");
  if (heard("yusuke", 1) && heard("shinji", 1)) ids.push("past");
  if (heard("rina", 1)) ids.push("rina-chihiro");
  if (heard("erika", 1)) ids.push("tanaka-home");
  if (recordsReady()) ids.push("call", "gate", "photo", "store", "autopsy");
  return FILE_ORDER.filter(function (id) { return ids.indexOf(id) !== -1; });
}

function pendingPeople() {
  return availablePeople().filter(function (person) {
    return availableRounds(person).some(function (round) { return !heard(person.id, round); });
  });
}

function unreadFiles() {
  return availableFileIds().filter(function (id) { return !state.seen["file:" + id]; });
}

function supplementLeft() {
  if (!autopsyRead()) return false;
  return STORY.spots.some(function (spot) {
    return spot.later && state.seen["spot:" + spot.id] && !state.seen["spot:" + spot.id + ":2"];
  });
}

function lead() {
  if (state.phase !== "day") return "夜明けの橋で、先輩の話を聞き、明るくなってから現場へ進む。";
  if (!heard("chihiro", 1)) return "妻の千春から、話を聞ける。";
  if (!phoneOpened()) return "橋の下の携帯を触ると、画面が開く。";
  if (!coreDone() && pendingPeople().length) return "名簿に、まだ話を聞いていない人がいる。";
  if (openMissions().length) return "次の捜査を、署で選べる。";
  if (pendingPeople().length) return "名簿に、まだ話を聞いていない人がいる。";
  if (recordsReady() && !autopsyRead()) return "記録と検視が届いた。";
  if (supplementLeft()) return "検視を踏まえて、現場の同じ箇所をもう一度見られる。";
  if (unreadFiles().length) return "まだ開いていない資料がある。";
  return CHARGE_LINE;
}

function addLog(id, text, banner) {
  if (!text || state.seen["note:" + id]) return;
  state.seen["note:" + id] = true;
  state.log.push(text);
  if (banner) state.queue.push(text);
}

function sync() {
  if (!state.started) return;
  if (state.phase === "day") addLog("day", "明るくなった橋の下へ戻った。");
  STORY.spots.forEach(function (spot) {
    if (state.seen["spot:" + spot.id]) addLog("spot:" + spot.id, spot.first, false);
    if (state.seen["spot:" + spot.id + ":2"] && spot.later) addLog("spot2:" + spot.id, spot.later, false);
  });
  Object.keys(STORY.briefs).forEach(function (key) {
    var seen = key.indexOf("file:") === 0 ? state.seen[key] : state.seen["talk:" + key];
    if (seen) addLog(key, STORY.briefs[key]);
  });
  if (coreDone()) addLog("ev-missions", "千春、夏希、正樹の話が揃った。次の捜査を、署で選べる。");
  if (recordsReady()) addLog("ev-records", "記録と検視が届いた。");
  if (autopsyRead()) addLog("ev-scene2", "現場へ戻って、同じ箇所をもう一度見られる。");
  if (!state.banner && state.queue.length) state.banner = state.queue.shift();
}

function setView(view, id) {
  state.view = view;
  state.viewId = id || "";
  save();
  render();
}

function render() {
  var title = document.getElementById("title");
  var app = document.getElementById("app");
  title.hidden = !!state.started;
  app.hidden = !state.started;
  if (!state.started) return;
  if (state.view === "file" && state.viewId) state.seen["file:" + state.viewId] = true;
  sync();
  document.getElementById("phase").textContent = state.phase === "day" ? "翌朝" : "夜明け";
  document.getElementById("go-scene").disabled = state.phase !== "day";
  document.getElementById("go-files").disabled = state.phase !== "day";
  var charge = document.getElementById("go-charge");
  charge.disabled = !autopsyRead();
  document.getElementById("go-solution").hidden = !state.admin;
  var unread = unreadFiles().length;
  document.getElementById("go-files").textContent = unread ? "資料（" + unread + "）" : "資料";
  var banner = document.getElementById("banner");
  banner.hidden = !state.banner;
  document.getElementById("banner-text").textContent = state.banner || "";
  renderRoster();
  renderStage();
  renderNotes();
  save();
}

function renderRoster() {
  var roster = document.getElementById("roster");
  var people = availablePeople();
  roster.hidden = !people.length;
  roster.innerHTML = "";
  if (!people.length) return;
  var heading = document.createElement("h2");
  heading.textContent = "話を聞ける人";
  roster.appendChild(heading);
  people.forEach(function (person) {
    var button = document.createElement("button");
    button.type = "button";
    var rounds = availableRounds(person);
    var waiting = rounds.some(function (round) { return !heard(person.id, round); });
    var again = rounds.indexOf(2) !== -1 && !heard(person.id, 2);
    button.className = "person-btn" + (state.view === "person" && state.viewId === person.id ? " on" : "") + (waiting ? " wait" : "");
    button.innerHTML = "<span>" + person.name + (again ? " ・再" : "") + "</span><small>" + person.role + "</small>";
    button.addEventListener("click", function () { openPerson(person.id); });
    roster.appendChild(button);
  });
}

function openPerson(id) {
  var person = personById(id);
  var rounds = availableRounds(person);
  var pending = rounds.filter(function (round) { return !heard(id, round); });
  state.view = "person";
  state.viewId = id;
  state.round = pending.length ? pending[0] : rounds[rounds.length - 1];
  save();
  render();
}

function renderStage() {
  var stage = document.getElementById("stage");
  if (state.view === "night") {
    stage.innerHTML = nightHtml();
    document.getElementById("to-morning").addEventListener("click", toMorning);
    return;
  }
  if (state.view === "scene") {
    stage.innerHTML = sceneHtml();
    stage.querySelectorAll("[data-spot]").forEach(function (button) {
      button.addEventListener("click", function () { inspect(button.dataset.spot); });
    });
    bindInk(stage);
    return;
  }
  if (state.view === "files") {
    stage.innerHTML = filesHtml();
    stage.querySelectorAll("[data-file]").forEach(function (button) {
      button.addEventListener("click", function () { setView("file", button.dataset.file); });
    });
    return;
  }
  if (state.view === "file") {
    var file = fileById(state.viewId);
    stage.innerHTML = inkBarHtml() + paperOpen("file:" + file.id) + "<h2>" + file.title + "</h2>" + file.html + "<button type=\"button\" id=\"back-files\">資料の一覧へ</button></article>";
    document.getElementById("back-files").addEventListener("click", function () { setView("files"); });
    bindInkTools(stage);
    bindTextInk(stage);
    return;
  }
  if (state.view === "person") {
    renderPerson(stage);
    return;
  }
  stage.innerHTML = deskHtml();
  var deskScene = document.getElementById("desk-scene");
  if (deskScene) deskScene.addEventListener("click", function () { setView("scene"); });
  stage.querySelectorAll("[data-mission]").forEach(function (button) {
    button.addEventListener("click", function () { startMission(button.dataset.mission); });
  });
}

function nightHtml() {
  return "<div class=\"scene night\"><div class=\"scene-frame\">" + STORY.sceneSvg + "<p class=\"scene-caption\">五時四十分すぎ。歩道橋の下。</p></div></div><article class=\"paper\"><h2>夜明け</h2><p>あなたは新米刑事だ。土曜の朝、五時四十分すぎ、新聞配達から連絡が入った。歩道橋の下で、人が倒れている、という。先輩と、橋の下に着く。</p><p>倒れているのは鈴木太一だと、その場で分かった。妻の千春からの通報ではない。先輩が、今は確保だけだ、と言った。携帯は回収したが、中身は明るくなってからだ。寸法も、あとで測る。</p><p>明るくなったら、もう一度見ろ、と先輩は言った。</p><button type=\"button\" id=\"to-morning\">明るくなって、もう一度見る</button></article>";
}

function toMorning() {
  state.phase = "day";
  state.view = "scene";
  state.viewId = "";
  save();
  render();
}

function inkBarHtml() {
  var html = "<div class=\"ink-bar\"><button type=\"button\" class=\"ink-mode" + (inkTool === "look" ? " on" : "") + "\" data-ink=\"look\">見る</button>";
  INK_COLORS.forEach(function (color) {
    html += "<button type=\"button\" class=\"ink-swatch" + (inkTool === color.id ? " on" : "") + "\" data-ink=\"" + color.id + "\" style=\"background:" + color.id + "\" aria-label=\"" + color.label + "\"></button>";
  });
  html += "<button type=\"button\" class=\"ink-mode" + (inkTool === "erase" ? " on" : "") + "\" data-ink=\"erase\">消す</button>";
  html += "<button type=\"button\" class=\"ink-mode\" data-ink=\"clear\">全部消す</button></div>";
  return html;
}

function sceneHtml() {
  var html = inkBarHtml();
  html += "<p class=\"scene-help\">翌朝の橋の下。横にずらして、気になるところを触る。</p>";
  html += "<div class=\"scene" + (inkTool === "look" ? "" : " inking") + "\"><div class=\"scene-frame\">" + STORY.sceneSvg;
  html += "<canvas class=\"scene-ink\" aria-hidden=\"true\"></canvas>";
  var areas = STORY.spots.filter(function (spot) { return spot.width || spot.height; });
  var points = STORY.spots.filter(function (spot) { return !(spot.width || spot.height); });
  areas.concat(points).forEach(function (spot) {
    var box = "left:" + spot.left + ";top:" + spot.top + ";";
    if (spot.width) box += "width:" + spot.width + ";";
    if (spot.height) box += "height:" + spot.height + ";";
    var wide = spot.width || spot.height ? " area" : "";
    html += "<button type=\"button\" class=\"pin" + wide + "\" style=\"" + box + "\" data-spot=\"" + spot.id + "\" aria-label=\"" + spot.label + "\"></button>";
  });
  html += "</div></div>";
  if (state.lastSpot) {
    var spot = spotById(state.lastSpot);
    var text = state.seen["spot:" + spot.id + ":2"] && spot.later ? spot.later : spot.first;
    html += "<article class=\"paper slim\"><h2>" + spot.label + "</h2><p>" + text + "</p></article>";
  }
  return html;
}

function drawStroke(ctx, stroke, width, height) {
  if (!stroke.points.length) return;
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.lineWidth = (stroke.erase ? 0.05 : 0.018) * width;
  if (stroke.erase) {
    ctx.globalCompositeOperation = "destination-out";
    ctx.strokeStyle = "#000";
  } else {
    ctx.globalCompositeOperation = "source-over";
    ctx.strokeStyle = stroke.color;
    ctx.globalAlpha = 0.9;
  }
  ctx.beginPath();
  stroke.points.forEach(function (point, index) {
    var x = point[0] * width;
    var y = point[1] * height;
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  if (stroke.points.length === 1) ctx.lineTo(stroke.points[0][0] * width + 0.2, stroke.points[0][1] * height);
  ctx.stroke();
  ctx.restore();
}

function paperOpen(inkId) {
  return "<article class=\"paper" + (inkTool === "look" ? "" : " inking") + "\" data-ink-id=\"" + inkId + "\">";
}

function textNodes(sheet) {
  var walker = document.createTreeWalker(sheet, NodeFilter.SHOW_TEXT, {
    acceptNode: function (node) {
      if (!node.nodeValue) return NodeFilter.FILTER_REJECT;
      var parent = node.parentNode;
      while (parent && parent !== sheet) {
        var tag = parent.tagName;
        if (tag === "BUTTON" || tag === "TEXTAREA" || tag === "INPUT" || tag === "SCRIPT" || tag === "STYLE") {
          return NodeFilter.FILTER_REJECT;
        }
        parent = parent.parentNode;
      }
      return NodeFilter.FILTER_ACCEPT;
    }
  });
  var nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  return nodes;
}

function unwrapInks(sheet) {
  sheet.querySelectorAll("mark.ink").forEach(function (mark) {
    var parent = mark.parentNode;
    while (mark.firstChild) parent.insertBefore(mark.firstChild, mark);
    parent.removeChild(mark);
  });
  sheet.normalize();
}

function paintNode(node, nodeStart, ranges) {
  var length = node.nodeValue.length;
  var local = [];
  ranges.forEach(function (range) {
    var start = Math.max(0, range.start - nodeStart);
    var end = Math.min(length, range.end - nodeStart);
    if (end > start) local.push({ start: start, end: end, color: range.color });
  });
  local.sort(function (a, b) { return b.start - a.start; });
  local.forEach(function (range) {
    var text = node;
    if (range.start > 0) text = node.splitText(range.start);
    var span = range.end - range.start;
    if (span < text.nodeValue.length) text.splitText(span);
    var mark = document.createElement("mark");
    mark.className = "ink";
    mark.setAttribute("data-color", range.color);
    text.parentNode.insertBefore(mark, text);
    mark.appendChild(text);
  });
}

function paintSheet(sheet, ranges) {
  if (!sheet) return;
  unwrapInks(sheet);
  var nodes = textNodes(sheet);
  var cursor = 0;
  var parts = nodes.map(function (node) {
    var start = cursor;
    cursor += node.nodeValue.length;
    return { node: node, start: start };
  });
  for (var i = parts.length - 1; i >= 0; i--) paintNode(parts[i].node, parts[i].start, ranges || []);
}

function applyStroke(ranges, start, end, color) {
  if (end < start) {
    var swap = start;
    start = end;
    end = swap;
  }
  if (end <= start) {
    return (ranges || []).map(function (range) {
      return { start: range.start, end: range.end, color: range.color };
    });
  }
  var next = [];
  (ranges || []).forEach(function (range) {
    if (range.end <= start || range.start >= end) {
      next.push({ start: range.start, end: range.end, color: range.color });
      return;
    }
    if (range.start < start) next.push({ start: range.start, end: start, color: range.color });
    if (range.end > end) next.push({ start: end, end: range.end, color: range.color });
  });
  if (color && end > start) next.push({ start: start, end: end, color: color });
  next.sort(function (a, b) { return a.start - b.start; });
  var merged = [];
  next.forEach(function (range) {
    var last = merged[merged.length - 1];
    if (last && last.color === range.color && last.end >= range.start) last.end = Math.max(last.end, range.end);
    else merged.push(range);
  });
  return merged;
}

function caretAt(x, y) {
  if (document.caretRangeFromPoint) {
    var range = document.caretRangeFromPoint(x, y);
    if (!range) return null;
    return { node: range.startContainer, offset: range.startOffset };
  }
  if (document.caretPositionFromPoint) {
    var caret = document.caretPositionFromPoint(x, y);
    if (!caret) return null;
    return { node: caret.offsetNode, offset: caret.offset };
  }
  return null;
}

function offsetAt(sheet, x, y) {
  var hit = caretAt(x, y);
  if (!hit || !sheet.contains(hit.node)) return null;
  if (hit.node.nodeType !== 3) {
    var child = hit.node.childNodes[hit.offset];
    if (child && child.nodeType === 3) hit = { node: child, offset: 0 };
    else return null;
  }
  var nodes = textNodes(sheet);
  var cursor = 0;
  for (var i = 0; i < nodes.length; i++) {
    if (nodes[i] === hit.node) return cursor + Math.max(0, Math.min(hit.offset, nodes[i].nodeValue.length));
    cursor += nodes[i].nodeValue.length;
  }
  return null;
}

function bindTextInk(root) {
  var sheet = root.querySelector(".paper[data-ink-id]");
  if (!sheet) return;
  if (!state.inks || typeof state.inks !== "object") state.inks = {};
  var id = sheet.dataset.inkId;
  paintSheet(sheet, state.inks[id] || []);
  var drag = null;

  sheet.addEventListener("pointerdown", function (event) {
    if (inkTool === "look") return;
    if (event.target.closest("button, a, textarea, input")) return;
    var start = offsetAt(sheet, event.clientX, event.clientY);
    if (start == null) return;
    drag = { pointer: event.pointerId, start: start, end: start };
    try { sheet.setPointerCapture(event.pointerId); } catch (e) {}
    event.preventDefault();
  }, { passive: false });
  sheet.addEventListener("pointermove", function (event) {
    if (!drag || event.pointerId !== drag.pointer) return;
    event.preventDefault();
    var end = offsetAt(sheet, event.clientX, event.clientY);
    if (end == null) return;
    drag.end = end;
    var color = inkTool === "erase" ? null : inkTool;
    paintSheet(sheet, applyStroke(state.inks[id] || [], drag.start, end, color));
  }, { passive: false });
  sheet.addEventListener("touchmove", function (event) {
    if (!drag) return;
    event.preventDefault();
  }, { passive: false });
  function finish(event) {
    if (!drag || (event && event.pointerId !== drag.pointer)) return;
    var end = event ? offsetAt(sheet, event.clientX, event.clientY) : null;
    if (end == null) end = drag.end;
    if (end != null && end !== drag.start) {
      var color = inkTool === "erase" ? null : inkTool;
      state.inks[id] = applyStroke(state.inks[id] || [], drag.start, end, color);
      paintSheet(sheet, state.inks[id]);
      save();
    } else paintSheet(sheet, state.inks[id] || []);
    drag = null;
  }
  sheet.addEventListener("pointerup", finish);
  sheet.addEventListener("pointercancel", function (event) {
    if (!drag || event.pointerId !== drag.pointer) return;
    if (drag.end === drag.start) {
      drag = null;
      paintSheet(sheet, state.inks[id] || []);
      return;
    }
    finish(event);
  });
}

function bindInkTools(root) {
  root.querySelectorAll("[data-ink]").forEach(function (button) {
    button.addEventListener("click", function () {
      if (button.dataset.ink === "clear") {
        var sheet = root.querySelector(".paper[data-ink-id]");
        if (sheet) {
          if (!state.inks || typeof state.inks !== "object") state.inks = {};
          state.inks[sheet.dataset.inkId] = [];
          paintSheet(sheet, []);
        }
        var canvas = root.querySelector(".scene-ink");
        if (canvas || !sheet) {
          state.ink = [];
          if (canvas) {
            var ctx = canvas.getContext("2d");
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.clearRect(0, 0, canvas.width, canvas.height);
          }
        }
        save();
        return;
      }
      inkTool = button.dataset.ink;
      var scene = root.querySelector(".scene");
      if (scene) scene.classList.toggle("inking", inkTool !== "look");
      var sheet = root.querySelector(".paper[data-ink-id]");
      if (sheet) sheet.classList.toggle("inking", inkTool !== "look");
      root.querySelectorAll("[data-ink]").forEach(function (item) {
        item.classList.toggle("on", item.dataset.ink === inkTool);
      });
    });
  });
}

function bindInk(root) {
  bindInkTools(root);
  var canvas = root.querySelector(".scene-ink");
  var img = root.querySelector(".scene-art");
  if (!canvas || !img) return;
  var drawing = null;

  function paint() {
    var ctx = canvas.getContext("2d");
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    (state.ink || []).forEach(function (stroke) {
      drawStroke(ctx, stroke, canvas.width, canvas.height);
    });
    if (drawing) drawStroke(ctx, drawing, canvas.width, canvas.height);
  }

  function fit() {
    var width = img.clientWidth;
    var height = img.clientHeight;
    if (!width || !height) return;
    var ratio = window.devicePixelRatio || 1;
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    paint();
  }

  function point(event) {
    var rect = canvas.getBoundingClientRect();
    return [
      Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width)),
      Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height))
    ];
  }

  canvas.addEventListener("pointerdown", function (event) {
    if (inkTool === "look") return;
    canvas.setPointerCapture(event.pointerId);
    drawing = { color: inkTool, erase: inkTool === "erase", points: [point(event)] };
    paint();
    event.preventDefault();
  }, { passive: false });
  canvas.addEventListener("pointermove", function (event) {
    if (!drawing) return;
    drawing.points.push(point(event));
    paint();
    event.preventDefault();
  }, { passive: false });
  canvas.addEventListener("touchmove", function (event) {
    if (!drawing) return;
    event.preventDefault();
  }, { passive: false });
  function finish(event) {
    if (!drawing) return;
    if (event) drawing.points.push(point(event));
    state.ink.push(drawing);
    drawing = null;
    save();
    paint();
  }
  canvas.addEventListener("pointerup", finish);
  canvas.addEventListener("pointercancel", function () {
    if (!drawing) return;
    if (drawing.points.length < 2) {
      drawing = null;
      paint();
      return;
    }
    finish();
  });

  fit();
  if (window.inkResize) window.removeEventListener("resize", window.inkResize);
  window.inkResize = function () {
    if (!document.body.contains(canvas)) return;
    fit();
  };
  window.addEventListener("resize", window.inkResize);
}

function inspect(id) {
  var spot = spotById(id);
  var first = !state.seen["spot:" + id];
  if (first) state.seen["spot:" + id] = true;
  else if (spot.later && autopsyRead() && !state.seen["spot:" + id + ":2"]) state.seen["spot:" + id + ":2"] = true;
  state.lastSpot = id;
  if (id === "phone" && first) {
    state.view = "file";
    state.viewId = "draft";
  }
  save();
  render();
}

function filesHtml() {
  var html = "<article class=\"paper\"><h2>資料</h2><div class=\"file-list\">";
  availableFileIds().forEach(function (id) {
    var file = fileById(id);
    var fresh = state.seen["file:" + id] ? "" : " wait";
    html += "<button type=\"button\" class=\"file-btn" + fresh + "\" data-file=\"" + id + "\">" + file.title + "</button>";
  });
  html += "</div></article>";
  return html;
}

function deskHtml() {
  var missions = openMissions();
  if (missions.length) {
    var html = "<article class=\"paper\"><h2>次の捜査</h2><p>千春、夏希、正樹の話が揃った。次に何をするか、ここから選ぶ。</p><div class=\"file-list\">";
    missions.forEach(function (mission) {
      html += "<button type=\"button\" class=\"file-btn wait\" data-mission=\"" + mission.id + "\"><span>" + mission.title + "</span><small>" + mission.text + "</small></button>";
    });
    html += "</div></article>";
    return html;
  }
  return "<article class=\"paper\"><h2>署</h2><p>" + (state.phase === "day" ? "翌朝。歩道橋の下で見つかった鈴木太一の死を、ここから調べる。" : "夜明けの確保が終わっていない。") + "</p><button type=\"button\" id=\"desk-scene\">現場へ</button></article>";
}

function startMission(id) {
  state.seen["mission:" + id] = true;
  if (id === "neighbors") {
    openPerson("neighbors");
    return;
  }
  var note = id === "refs"
    ? "祐介、莉奈、慎司、裕子を署に呼んだ。"
    : "冬美と絵里香に、話を確かめる。";
  addLog("mission:" + id, note);
  save();
  render();
}

function renderPerson(stage) {
  var person = personById(state.viewId);
  var rounds = availableRounds(person);
  if (rounds.indexOf(state.round) === -1) state.round = rounds[0];
  var known = heard(person.id, state.round);
  var html = inkBarHtml() + paperOpen("person:" + person.id + ":" + state.round) + "<p class=\"role\">" + person.role + "</p><h2>" + person.name + "</h2>";
  if (rounds.length > 1) {
    html += "<div class=\"rounds\">";
    rounds.forEach(function (round) {
      html += "<button type=\"button\" class=\"round" + (round === state.round ? " on" : "") + "\" data-round=\"" + round + "\">" + (round === 1 ? "一回目" : "二回目") + "</button>";
    });
    html += "</div>";
  }
  html += person.rounds[state.round];
  if (!known) html += "<button type=\"button\" id=\"keep-talk\">この話をメモに残す</button>";
  else html += "<p class=\"kept\">この話は、メモに残してある。</p>";
  html += "<button type=\"button\" id=\"back-desk\">署へ戻る</button></article>";
  stage.innerHTML = html;
  stage.querySelectorAll("[data-round]").forEach(function (button) {
    button.addEventListener("click", function () {
      state.round = Number(button.dataset.round);
      save();
      render();
    });
  });
  var keep = document.getElementById("keep-talk");
  if (keep) keep.addEventListener("click", keepTalk);
  document.getElementById("back-desk").addEventListener("click", function () { setView("desk"); });
  bindInkTools(stage);
  bindTextInk(stage);
}

function keepTalk() {
  var before = coreDone();
  state.seen["talk:" + state.viewId + ":" + state.round] = true;
  if (!before && coreDone()) {
    state.view = "desk";
    state.viewId = "";
  }
  save();
  render();
}

function renderNotes() {
  var notes = document.getElementById("notes");
  var memo = document.getElementById("memo");
  var focused = memo && document.activeElement === memo;
  var start = focused ? memo.selectionStart : 0;
  var end = focused ? memo.selectionEnd : 0;
  var html = "<h2>わかったこと</h2>";
  if (!state.log.length) html += "<p class=\"empty\">まだ、何も書いていない。</p>";
  else {
    html += "<div class=\"log-list\">";
    state.log.forEach(function (line) { html += "<p>" + line + "</p>"; });
    html += "</div>";
  }
  html += "<h2>見立て</h2>";
  var marked = STORY.people.filter(function (person) { return person.suspect && heard(person.id, 1); });
  if (!marked.length) html += "<p class=\"empty\">話を聞くと、名前が並ぶ。</p>";
  else {
    marked.forEach(function (person) {
      html += "<div class=\"mark-row\"><span>" + person.name + "</span><span class=\"marks\">";
      ["シロ", "保留", "クロ"].forEach(function (label) {
        var on = state.marks[person.suspect] === label ? " on" : "";
        html += "<button type=\"button\" class=\"mark" + on + "\" data-who=\"" + person.suspect + "\" data-mark=\"" + label + "\">" + label + "</button>";
      });
      html += "</span></div>";
    });
  }
  html += "<label for=\"memo\">メモ</label><textarea id=\"memo\"></textarea>";
  notes.innerHTML = html;
  var field = document.getElementById("memo");
  field.value = state.memo || "";
  field.addEventListener("input", function () {
    state.memo = field.value;
    save();
  });
  if (focused) {
    field.focus();
    field.selectionStart = start;
    field.selectionEnd = end;
  }
  notes.querySelectorAll(".mark").forEach(function (button) {
    button.addEventListener("click", function () {
      state.marks[button.dataset.who] = button.dataset.mark;
      save();
      renderNotes();
    });
  });
}

function itemLabel(list, id) {
  var found = list.filter(function (item) { return item.id === id; })[0];
  return found ? found.label : "";
}

function chosenPeople() {
  return STORY.suspects.filter(function (person) { return pick.who.indexOf(person.id) !== -1; });
}

function whoKey() {
  if (pick.none) return "none";
  var ids = chosenPeople().map(function (person) { return person.id; });
  return ids.length === 1 ? ids[0] : ids.join("+");
}

function whoNames() {
  return chosenPeople().map(function (person) { return person.name; }).join("、");
}

function whoSummary() {
  if (pick.none) return "犯人はいない。事故";
  if (pick.who.length === 1) return "一人：" + whoNames();
  if (pick.who.length > 1) return "複数：" + whoNames();
  return "";
}

function whoCountText() {
  if (pick.none) return "犯人はいない。事故です";
  if (!pick.who.length) return "まだ選んでいません";
  if (pick.who.length === 1) return "一人です";
  return "複数です（" + pick.who.length + "人）";
}

function openAnswer() {
  if (!autopsyRead()) return;
  pick = { who: [], none: false, alibi: "", trick: "" };
  step = "who";
  document.getElementById("modal").hidden = false;
  renderAnswer();
}

function closeModal() {
  document.getElementById("modal").hidden = true;
  document.getElementById("modal").innerHTML = "";
}

function moveStep(next) {
  step = next;
  renderAnswer();
}

function renderAnswer() {
  var modal = document.getElementById("modal");
  modal.hidden = false;
  var title = "人";
  var body = "";
  if (step === "result") {
    renderResult(modal);
    return;
  }
  if (step === "confirm") {
    title = "これでよろしいですか？";
    body = summaryBlock("人", whoSummary());
    if (!pick.none) {
      body += summaryBlock("崩れるアリバイ", itemLabel(STORY.alibis, pick.alibi));
      body += summaryBlock("犯行トリック", itemLabel(STORY.tricks, pick.trick));
    }
  } else if (step === "alibi") {
    title = "崩れるアリバイ";
  } else if (step === "trick") {
    title = "犯行トリック";
  }
  modal.innerHTML = "<div class=\"modal-card\"><h2>" + title + "</h2><div id=\"modal-body\"></div><div id=\"modal-actions\" class=\"modal-actions\"></div></div>";
  var box = document.getElementById("modal-body");
  var actions = document.getElementById("modal-actions");
  if (step === "confirm") {
    box.className = "summary";
    box.innerHTML = body;
    actions.appendChild(actionButton("はい", function () { moveStep("result"); }));
    actions.appendChild(actionButton("戻る", function () { moveStep(pick.none ? "who" : "trick"); }));
    return;
  }
  if (step === "who") {
    STORY.suspects.forEach(function (person) {
      var button = document.createElement("button");
      button.type = "button";
      button.className = "choice" + (pick.who.indexOf(person.id) !== -1 ? " on" : "");
      button.textContent = person.name;
      button.addEventListener("click", function () {
        pick.none = false;
        var at = pick.who.indexOf(person.id);
        if (at === -1) pick.who.push(person.id);
        else pick.who.splice(at, 1);
        renderAnswer();
      });
      box.appendChild(button);
    });
    var count = document.createElement("p");
    count.className = "who-count";
    count.textContent = whoCountText();
    box.appendChild(count);
    var none = document.createElement("button");
    none.type = "button";
    none.className = "choice" + (pick.none ? " on" : "");
    none.textContent = "犯人はいない。事故";
    none.addEventListener("click", function () {
      pick.none = !pick.none;
      if (pick.none) pick.who = [];
      renderAnswer();
    });
    box.appendChild(none);
    actions.appendChild(actionButton("次へ", function () {
      if (!pick.none && !pick.who.length) return;
      moveStep(pick.none ? "confirm" : "alibi");
    }));
    actions.appendChild(actionButton("署へ戻る", closeModal));
    return;
  }
  var current = {
    alibi: STORY.alibis,
    trick: STORY.tricks
  }[step];
  current.forEach(function (item) {
    var button = document.createElement("button");
    button.type = "button";
    button.className = "choice";
    button.textContent = item.label;
    button.addEventListener("click", function () {
      pick[step] = item.id;
      moveStep(answerSteps[answerSteps.indexOf(step) + 1]);
    });
    box.appendChild(button);
  });
  actions.appendChild(actionButton("戻る", function () {
    moveStep(answerSteps[answerSteps.indexOf(step) - 1]);
  }));
}

function summaryBlock(label, text) {
  return "<p class=\"label\">" + label + "</p><p>" + text + "</p>";
}

function actionButton(label, onClick) {
  var button = document.createElement("button");
  button.type = "button";
  button.textContent = label;
  button.addEventListener("click", onClick);
  return button;
}

function renderResult(modal) {
  var who = whoKey();
  var title = "不正解";
  var text = "この読みは、資料と合いません。";
  var again = false;
  if (who === "s6" && pick.alibi === "ab1" && pick.trick === "tr1") {
    state.solved = true;
    state.closed = false;
    save();
    title = "正解";
    text = SOLUTION;
  } else if (who === "s6" && pick.alibi === "ab1" && pick.trick === "tr4") {
    state.closed = false;
    save();
    text = "居場所は崩れています。酒屋の時刻と、傷の中の油と、足音が一つであることが残っています。";
    again = true;
  } else if (who === "s7" && pick.trick === "tr2") {
    state.closed = true;
    save();
    text = "翌朝の調べは、ここで閉じたように見えます。拳は腫れていて、下書きは正樹を拒んでいます。正樹は二十時五分に殴っています。そのあと、二十時四十四分の通話で太一はまだ話しています。時計をどちらへずらしても、二十時五分の太一家、二十時四十七分の橋、酒屋の会計は一つに揃いません。";
    again = true;
  } else if (who === "s5" && pick.trick === "tr3") {
    state.closed = true;
    save();
    text = "千春は物音を聞いて、見に行っていません。シャツも洗っています。それでも、千春側の通話は室内で、二十時四十五分のニュースが入っています。自転車は橋の下にあります。家を出ずに、橋の自転車は倒していません。洗濯の開始は二十時三十分で、死亡の推定より前です。";
    again = true;
  } else {
    state.closed = false;
    save();
    if (who === "none") text = "この死は、事故では閉じていません。後頭部の傷と、自転車の倒れ方を、寸法の表と並べてください。";
    else if (who === "s6" && pick.alibi === "ab1") text = "居場所は崩れています。現場に残ったものの幅と厚さを、二十時四十九分と並べてください。";
    else if (who === "s6" && pick.trick === "tr1") text = "手順はそちらです。届いた写真の画面と、東門の時刻を見てください。";
    else if (who === "s6" && pick.trick === "tr4") text = "殴った人を分ける前に、二十時五十分の写真が、その時刻の部屋かどうか見てください。";
    else if (who === "s7") text = "正樹は二十時五分に殴っています。そのあと、二十時四十四分の通話で太一はまだ話しています。時計をどちらへずらしても、二十時五分の太一家、二十時四十七分の橋、酒屋の会計は一つに揃いません。";
    else if (who === "s5") text = "千春側に入っている音は、二十時四十五分のニュースです。番組表のその枠と、太一側の風を並べてください。";
    else if (who === "s1+s4") text = "裕子と莉奈は、二十時四十六分に湯船で名前を呼び合っています。橋の声と、同じ分です。足音は一つで、この二人ではありません。";
    else if (who === "s2+s3") text = "祐介と慎司は、バルコニーから出ていません。この二人の居場所は崩れていません。";
    else if (who === "s6+s7") text = "足音は一つです。酒屋の時刻と、東門の十二分は、二人同時には合いません。";
  }
  modal.innerHTML = "<div class=\"modal-card\"><h2>" + title + "</h2><div class=\"end\"><p></p></div><div id=\"modal-actions\" class=\"modal-actions\"></div></div>";
  modal.querySelector(".end p").textContent = text;
  var actions = document.getElementById("modal-actions");
  if (again) {
    actions.appendChild(actionButton("もう一度開く", function () {
      state.closed = false;
      save();
      moveStep("who");
    }));
  }
  actions.appendChild(actionButton("署へ戻る", closeModal));
}

function choiceLabel(list, id) {
  var item = list.filter(function (entry) { return entry.id === id; })[0];
  return item ? (item.name || item.label) : "";
}

function openSolution() {
  if (!state.admin) return;
  var solved = state.solved;
  var modal = document.getElementById("modal");
  modal.hidden = false;
  modal.innerHTML = "<div class=\"modal-card\"><h2>答え</h2><div class=\"summary\">"
    + summaryBlock("人", choiceLabel(STORY.suspects, "s6"))
    + summaryBlock("崩れるアリバイ", choiceLabel(STORY.alibis, "ab1"))
    + summaryBlock("犯行トリック", choiceLabel(STORY.tricks, "tr1"))
    + "</div><div class=\"end\"><p></p></div><div id=\"modal-actions\" class=\"modal-actions\"></div></div>";
  modal.querySelector(".end p").textContent = SOLUTION;
  document.getElementById("modal-actions").appendChild(actionButton("署へ戻る", closeModal));
  state.solved = solved;
}

function openHints() {
  var modal = document.getElementById("modal");
  modal.hidden = false;
  renderHints();
}

function renderHints() {
  var modal = document.getElementById("modal");
  var ready = lead() === CHARGE_LINE;
  modal.innerHTML = "<div class=\"modal-card\"><h2>ヒント</h2><div id=\"modal-body\"></div><div id=\"modal-actions\" class=\"modal-actions\"></div></div>";
  var body = document.getElementById("modal-body");
  var leadLine = document.createElement("p");
  leadLine.textContent = lead();
  body.appendChild(leadLine);
  var actions = document.getElementById("modal-actions");
  if (ready) {
    STORY.hints.slice(0, state.hints).forEach(function (text, index) {
      var line = document.createElement("p");
      line.textContent = (index + 1) + ". " + text;
      body.appendChild(line);
    });
    if (state.hints < STORY.hints.length) {
      actions.appendChild(actionButton("次のヒント", function () {
        state.hints += 1;
        save();
        renderHints();
      }));
    }
  }
  actions.appendChild(actionButton("署へ戻る", closeModal));
}

document.getElementById("start").addEventListener("click", function () {
  state.started = true;
  state.admin = !!document.getElementById("admin-mode").checked;
  state.phase = "night";
  state.view = "night";
  save();
  render();
});

document.getElementById("go-desk").addEventListener("click", function () {
  setView(state.phase === "day" ? "desk" : "night");
});

document.getElementById("go-scene").addEventListener("click", function () {
  if (state.phase === "day") setView("scene");
});

document.getElementById("go-files").addEventListener("click", function () {
  if (state.phase === "day") setView("files");
});

document.getElementById("go-hint").addEventListener("click", openHints);
document.getElementById("go-charge").addEventListener("click", openAnswer);
document.getElementById("go-solution").addEventListener("click", openSolution);
document.getElementById("banner-ok").addEventListener("click", function () {
  state.banner = state.queue.shift() || "";
  save();
  render();
});

document.getElementById("go-reset").addEventListener("click", function () {
  if (!confirm("最初からやり直します。書いたメモも消えます。")) return;
  localStorage.removeItem(SAVE_KEY);
  state = fresh();
  closeModal();
  render();
});

render();
