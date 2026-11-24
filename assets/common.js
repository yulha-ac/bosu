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

  // 화면의 [data-site="키"] 칸에 교육원 정보 채우기
  function fillSite() {
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

  function param(name) {
    return new URLSearchParams(location.search).get(name) || '';
  }

  window.BOSU = { krDate: krDate, loadCourses: loadCourses, submit: submit, fillSite: fillSite, esc: esc, param: param };
  document.addEventListener('DOMContentLoaded', fillSite);
})();
