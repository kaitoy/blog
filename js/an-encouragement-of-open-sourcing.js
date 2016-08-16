$(function() {
  window.an_encouragement_of_open_sourcing_chart_1 = new Chart(document.getElementById("an-encouragement-of-open-sourcing-chart-1"), {
    type: 'doughnut',
    data: {
      labels: ["Javascript", "Java", "Ruby", "Python", "PHP", "HTML", "CSS", "C++", "その他"],
      datasets: [{
        data: [1666436, 1501840, 853054, 788779, 664046, 530632, 526817, 427776, 7349027],
        backgroundColor: [
          'rgb(255, 81, 64)',
          'rgb(255, 159, 64)',
          'rgb(255, 253, 85)',
          'rgb(108, 255, 64)',
          'rgb(54, 162, 235)',
          'rgb(64, 66, 255)',
          'rgb(153, 102, 255)',
          'rgb(255, 99, 132)',
          'rgb(150, 150, 150)',
        ],
      }],
    },
    options: {
      responsive: true,
    }
  });

  window.an_encouragement_of_open_sourcing_chart_2 = new Chart(document.getElementById("an-encouragement-of-open-sourcing-chart-2"), {
    type: 'doughnut',
    data: {
      labels: ["★1000以上", "★900～1000", "★800～900", "★700～800", "★600～700", "★500～600", "★400～500", "★300～400", "★200～300", "★100～200", "★100未満"],
      datasets: [{
        data: [7821, 894, 1142, 1534, 1977, 2664, 3804, 6129, 11072, 28505, 12795535],
        borderWidth: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        backgroundColor: [
          'rgb(255, 81, 64)',
          'rgb(255, 159, 64)',
          'rgb(255, 253, 85)',
          'rgb(108, 255, 64)',
          'rgb(54, 162, 235)',
          'rgb(64, 66, 255)',
          'rgb(153, 102, 255)',
          'rgb(255, 99, 132)',
          'rgb(255, 216, 99)',
          'rgb(225, 249, 37)',
          'rgb(150, 150, 150)',
        ],
      }],
    },
    options: {
      responsive: true,
      // scales: {
      //   yAxes: [{
      //     ticks: {
      //       min: 0,
      //       max: 100000,
      //     },
      //   }],
      // },
    }
  });

  window.an_encouragement_of_open_sourcing_chart_3 = new Chart(document.getElementById("an-encouragement-of-open-sourcing-chart-3"), {
    type: 'doughnut',
    data: {
      labels: ["★1000以上", "★900～1000", "★800～900", "★700～800", "★600～700", "★500～600", "★400～500", "★300～400", "★200～300", "★100～200", "★100未満"],
      datasets: [{
        data: [791, 101, 142, 180, 232, 319, 462, 639, 1056, 2532, 1685604],
        borderWidth: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        backgroundColor: [
          'rgb(255, 81, 64)',
          'rgb(255, 159, 64)',
          'rgb(255, 253, 85)',
          'rgb(108, 255, 64)',
          'rgb(54, 162, 235)',
          'rgb(64, 66, 255)',
          'rgb(153, 102, 255)',
          'rgb(255, 99, 132)',
          'rgb(255, 216, 99)',
          'rgb(225, 249, 37)',
          'rgb(150, 150, 150)',
        ],
      }],
    },
    options: {
      responsive: true,
      // scales: {
      //   yAxes: [{
      //     ticks: {
      //       min: 0,
      //       max: 100000,
      //     },
      //   }],
      // },
    }
  });
});
