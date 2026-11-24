/* 모든 페이지 공통 기능 */
(function () {
  var S = window.SITE;
  var DAYS = ['일', '월', '화', '수', '목', '금', '토'];

  // 'YYYY-MM-DD' -> '3월 20일(토)'
  function krDate(s) {
    if (!s) return '';
    var p = s.split('-').map(Number);
    var d = new Date(p[0], p[1] - 1, p[2]);
    return p[1] + '월 ' + p[2] + '일(' + DAYS[d.getDay()] + ')';
  }

  // 오늘 날짜 문자열 (한국 시간)
  function today() {
    var d = new Date(Date.now() + 9 * 3600 * 1000);
    return d.toISOString().slice(0, 10);
  }

  // 미리보기용 상태 계산 (API 주소가 없을 때)
  function localStatus(c) {
    var t = today();
    if (t > c.date) return '교육종료';
    if (c.applied >= c.capacity) return '정원마감';
    if (c.deadline && t > c.deadline) return '신청마감';
    return '모집중';
  }

  // 차수 목록 불러오기
  function loadCourses() {
    if (!S.API_URL) {
      var list = S.FALLBACK.map(function (r) {
        var d = new Date(r[2] + 'T00:00:00');
        var dl = new Date(d.getTime() - 7 * 86400000);
        var c = {
          id: r[0], name: r[1], date: r[2], time: '09:00~18:00',
          place: S.name + ' (' + S.city + ')', capacity: 40, applied: 0, remain: 40,
          deadline: dl.getFullYear() + '-' + ('0' + (dl.getMonth() + 1)).slice(-2) + '-' + ('0' + dl.getDate()).slice(-2)
        };
        c.status = localStatus(c);
        return c;
      });
      return Promise.resolve({ demo: true, courses: list });
    }
    return fetch(S.API_URL + '?t=' + Date.now())
      .then(function (r) { return r.json(); })
      .then(function (j) { return { demo: false, courses: j.courses || [] }; });
  }

  // 신청서 보내기
  function submit(payload) {
    if (!S.API_URL) {
      return Promise.resolve({ ok: false, message: '미리보기 모드입니다. 설정 파일에 API 주소를 넣으면 신청이 저장됩니다.' });
    }
    return fetch(S.API_URL, { method: 'POST', body: JSON.stringify(payload) })
      .then(function (r) { return r.json(); });
  }


  // 상단 탭 (교육신청 / 신청확인 / 수료증) - 모든 페이지 머리글 아래에 자동 표시
  function renderTabs() {
    var page = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
    var active = page === 'check.html' ? 'check' : page === 'certificate.html' ? 'cert' : 'apply';
    var tabs = [
      ['apply', 'index.html', '교육신청'],
      ['check', 'check.html', '신청확인'],
      ['cert', 'certificate.html', '수료증']
    ];
    var nav = document.createElement('nav');
    nav.className = 'tabs';
    nav.setAttribute('aria-label', '주요 메뉴');
    nav.innerHTML = '<div class="wrap">' + tabs.map(function (t) {
      return '<a href="' + t[1] + '"' + (t[0] === active ? ' class="on" aria-current="page"' : '') + '>' + t[2] + '</a>';
    }).join('') + '</div>';
    var head = document.querySelector('header.top');
    if (head) head.parentNode.insertBefore(nav, head.nextSibling);
  }

  // 화면의 [data-site="키"] 칸에 교육원 정보 채우기
  function fillSite() {
    renderTabs();
    document.querySelectorAll('[data-site]').forEach(function (el) {
      var v = S[el.getAttribute('data-site')];
      if (v != null) el.textContent = v;
    });
    if (!S.API_URL) {
      var b = document.createElement('div');
      b.className = 'demo';
      b.textContent = '미리보기 모드: 신청 현황은 예시이며 신청서는 저장되지 않습니다.';
      document.body.insertBefore(b, document.body.firstChild);
    }
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }


  // 생년월일(YYMMDD) 검사: 실제 달력에 있는 날짜인지, 나이가 맞는지 확인
  // 문제가 없으면 '' , 문제가 있으면 안내 문구를 돌려줌
  function birthError(v) {
    var b = String(v || '').replace(/\D/g, '');
    if (b.length !== 6) return '생년월일은 숫자 6자리(YYMMDD)로 입력해 주세요. 예: 640512';
    var yy = +b.slice(0, 2), mm = +b.slice(2, 4), dd = +b.slice(4, 6);
    if (mm < 1 || mm > 12) return '월(3~4번째 자리)은 01~12 사이로 입력해 주세요. 입력하신 값: ' + b.slice(2, 4);
    var now = new Date(Date.now() + 9 * 3600 * 1000); // 한국 시간
    var curY = now.getUTCFullYear();
    var year = yy > curY % 100 ? 1900 + yy : 2000 + yy; // 올해 뒷자리보다 크면 1900년대
    var last = new Date(Date.UTC(year, mm, 0)).getUTCDate(); // 그 달의 마지막 날
    if (dd < 1 || dd > last) return '일(5~6번째 자리)을 확인해 주세요. ' + year + '년 ' + mm + '월은 ' + last + '일까지 있습니다.';
    var age = curY - year;
    var m0 = now.getUTCMonth() + 1, d0 = now.getUTCDate();
    if (m0 < mm || (m0 === mm && d0 < dd)) age--;
    if (age < 18) return '만 18세 미만으로 계산됩니다. 생년월일을 다시 확인해 주세요.';
    if (age > 100) return '생년월일을 다시 확인해 주세요.';
    return '';
  }


  // 요양보호사 자격증번호 검사 (연도 4자리 + 번호 7자리)
  // level: 'error'(다시 입력) / 'confirm'(맞는지 확인) / 'ok'(통과)
  function licenseCheck(year, no) {
    var y = String(year || '').replace(/\D/g, ''), n = String(no || '').replace(/\D/g, '');
    var min = S.licenseYearMin || 2007, max = S.licenseYearMax || 2027;
    if (!y && !n) return { level: 'error', msg: '요양보호사 자격증번호를 입력해 주세요.' };
    if (y.length !== 4 || +y < min || +y > max) {
      return { level: 'error', msg: '자격증번호 앞자리(발급연도)는 ' + min + '~' + max + ' 사이의 4자리로 입력해 주세요.' };
    }
    if (n.length !== 7) return { level: 'error', msg: '자격증번호 뒷자리는 숫자 7자리로 입력해 주세요.' };
    if (n.slice(0, 2) !== '10') {
      return { level: 'error', msg: '자격증번호 뒷자리는 10으로 시작합니다. 자격증 번호를 다시 확인해 주세요.' };
    }
    if (n.charAt(2) !== '0') {
      return { level: 'confirm', msg: '자격증번호 ' + y + '-' + n + ' 가 맞습니까?' };
    }
    return { level: 'ok', msg: '' };
  }

  // '2015-1001234', '20151001234' 같은 문자열을 [연도, 번호]로 나눔 (엑셀 붙여넣기용)
  function licenseSplit(v) {
    var s = String(v || '').trim();
    var m = s.match(/^(\d{4})\s*-\s*(\d+)$/);
    if (m) return [m[1], m[2]];
    var d = s.replace(/\D/g, '');
    return d.length === 11 ? [d.slice(0, 4), d.slice(4)] : [d.slice(0, 4), d.slice(4)];
  }

  // 연도칸, 번호칸 입력 도우미: 숫자만, 연도 4자리를 채우면 번호칸으로 이동
  function bindLicense(yEl, nEl) {
    yEl.addEventListener('input', function () {
      this.value = this.value.replace(/\D/g, '').slice(0, 4);
      if (this.value.length === 4) nEl.focus();
    });
    nEl.addEventListener('input', function () { this.value = this.value.replace(/\D/g, '').slice(0, 7); });
    nEl.addEventListener('keydown', function (e) {
      if (e.key === 'Backspace' && !this.value) yEl.focus();
    });
  }

  // 화면 안 확인창 (브라우저 alert 대신 사용). 누른 버튼의 value 를 돌려줌
  function modal(title, body, buttons) {
    return new Promise(function (resolve) {
      var bg = document.createElement('div');
      bg.className = 'modal-bg';
      bg.innerHTML = '<div class="modal" role="dialog" aria-modal="true"><h3></h3><div class="modal-body"></div><div class="modal-btns"></div></div>';
      bg.querySelector('h3').textContent = title;
      bg.querySelector('.modal-body').innerHTML = body;
      var box = bg.querySelector('.modal-btns');
      buttons.forEach(function (b) {
        var el = document.createElement('button');
        el.type = 'button';
        el.className = 'btn' + (b.line ? ' line' : '');
        el.textContent = b.label;
        el.onclick = function () { document.body.removeChild(bg); resolve(b.value); };
        box.appendChild(el);
      });
      document.body.appendChild(bg);
      box.lastChild.focus();
    });
  }

  function param(name) {
    return new URLSearchParams(location.search).get(name) || '';
  }

  // ===== 장기요양기관기호 입력 (1자리-5자리-5자리, 첫 자리 1~3) =====
  // 화면에 <div data-org="org" data-next="다음칸id"></div> 를 두면 입력칸 3개를 만들어 줌
  function orgHtml(px) {
    return '<div class="lic org">' +
      '<input type="tel" id="' + px + 'A" class="a" inputmode="numeric" maxlength="1" placeholder="1" aria-label="기관기호 첫 자리">' +
      '<span>-</span><input type="tel" id="' + px + 'B" class="b" inputmode="numeric" maxlength="5" placeholder="00000" aria-label="기관기호 가운데 5자리">' +
      '<span>-</span><input type="tel" id="' + px + 'C" class="b" inputmode="numeric" maxlength="5" placeholder="00000" aria-label="기관기호 끝 5자리">' +
      '</div><div class="err" id="' + px + 'Err"></div>';
  }
  function bindOrg(px, nextId) {
    var g = function (k) { return document.getElementById(px + k); };
    var api = {
      value: function () { return g('A').value + '-' + g('B').value + '-' + g('C').value; },
      error: function () {
        var a = g('A').value, b = g('B').value, c = g('C').value;
        if (!a && !b && !c) return '장기요양기관기호를 입력해 주세요.';
        if (!/^[1-3]$/.test(a)) return '기관기호 첫 자리는 1, 2, 3 중 하나입니다.';
        if (!/^\d{5}$/.test(b) || !/^\d{5}$/.test(c)) return '기관기호는 1자리-5자리-5자리, 숫자 11자리입니다.';
        return '';
      },
      focus: function () { g('A').focus(); }
    };
    function fill(d) { g('A').value = d.slice(0, 1); g('B').value = d.slice(1, 6); g('C').value = d.slice(6, 11); g('C').focus(); }
    function show() {
      var box = g('Err'), any = g('A').value || g('B').value || g('C').value;
      var ae = document.activeElement && document.activeElement.id;
      box.textContent = (any && [px + 'A', px + 'B', px + 'C'].indexOf(ae) < 0) ? api.error() : '';
      box.classList.toggle('on', !!box.textContent);
    }
    [['A', 1, px + 'B'], ['B', 5, px + 'C'], ['C', 5, nextId]].forEach(function (o) {
      var el = g(o[0]);
      el.addEventListener('input', function () {
        var d = el.value.replace(/\D/g, '');
        if (o[0] === 'A' && d.length > 1) { fill(d); return; }   // 첫 칸에 전체 번호 입력
        el.value = d.slice(0, o[1]);
        if (el.value.length === o[1] && o[2] && document.getElementById(o[2])) document.getElementById(o[2]).focus();
      });
      el.addEventListener('paste', function (e) {
        var d = (e.clipboardData || window.clipboardData).getData('text').replace(/\D/g, '');
        if (d.length === 11) { e.preventDefault(); fill(d); show(); }
      });
      el.addEventListener('blur', function () { setTimeout(show, 250); });
    });
    return api;
  }

  // 진행상태 -> 화면 문구
  function statusLabel(st) {
    return { '접수': '신청완료', '입금확인': '교육비 납부완료', '확정': '교육비 납부완료', '수료': '수료',
      '취소': '수강취소 (환불 처리 중)', '환불완료': '수강취소 및 환불완료' }[st] || st;
  }

  window.BOSU = { licenseCheck: licenseCheck, licenseSplit: licenseSplit, bindLicense: bindLicense, modal: modal, birthError: birthError, krDate: krDate, loadCourses: loadCourses, submit: submit, fillSite: fillSite, esc: esc, param: param, orgHtml: orgHtml, bindOrg: bindOrg, statusLabel: statusLabel };
  document.addEventListener('DOMContentLoaded', fillSite);
})();
