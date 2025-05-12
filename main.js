// main.js

const svg = d3.select("#faceSVG");
svg.append("image")
  .attr("xlink:href", "data/face.png")
  .attr("x", 0)
  .attr("y", 0)
  .attr("width", 400)
  .attr("height", 500);

const regions = [
  { name: "forehead", cx: 200, cy: 170, temp: 37 },
  { name: "leftEye", cx: 140, cy: 240, temp: 37 },
  { name: "rightEye", cx: 270, cy: 240, temp: 37 },
  { name: "mouth", cx: 200, cy: 355, temp: 37 }
];

const colorScale = d3.scaleLinear()
  .domain([35, 36.5, 37.5, 38.5, 40])
  .range([
    "#b2dfdb",  
    "#ffffcc",  
    "#ffeb99", 
    "#ffb347",  
    "#d73027"  
]);

const circles = svg.selectAll("circle")
  .data(regions)
  .enter()
  .append("circle")
  .attr("id", d => d.name)
  .attr("cx", d => d.cx)
  .attr("cy", d => d.cy)
  .attr("r", 20)
  .attr("fill", d => colorScale(d.temp))
  .on("click", function (event, d) {
    d3.select("#tempSlider").property("value", d.temp);
    d3.select("#tempDisplay").text(d.temp.toFixed(1));
    selectedRegion = d;
  })
  .on("mouseover", function (event, d) {
    d3.select("#tooltip")
      .style("display", "block")
      .html(`<strong>${d.name}</strong>: ${d.temp.toFixed(1)}°C`);
  })
  .on("mousemove", function (event) {
    d3.select("#tooltip")
      .style("left", (event.pageX + 10) + "px")
      .style("top", (event.pageY - 28) + "px");
  })
  .on("mouseout", function () {
    d3.select("#tooltip").style("display", "none");
  });

let selectedRegion = null;

// columns in our dataset for each region
const regionToColumn = {
  forehead: "T_FH_Max1",
  leftEye: "T_LC_Max1",
  rightEye: "T_RC_Max1",
  mouth: "T_OR_Max1"
};

let currentOffsets = {};
let selectedGroup = d3.select("#groupSelect").property("value");

loadAndComputeOffsets(selectedGroup);

d3.select("#groupSelect").on("change", function () {
  selectedGroup = this.value;
  loadAndComputeOffsets(selectedGroup);
});



const slider = d3.select("#tempSlider");
d3.select("#tempSlider").on("input", function () {
  const baseTemp = +this.value;
  d3.select("#tempDisplay").text(baseTemp.toFixed(1));

  if (selectedRegion && currentOffsets[selectedRegion.name]) {
    regions.forEach(region => {
      const offset = currentOffsets[selectedRegion.name][region.name];
      region.temp = baseTemp + offset;

      d3.select(`#${region.name}`)
        .attr("fill", colorScale(region.temp));

      if (d3.select("#alertToggle").property("checked")) {
        d3.select(`#${region.name}`).classed("glow", region.temp >= 38);
      } else {
        d3.select(`#${region.name}`).classed("glow", false);
      }
    });

    const feedbackText = document.getElementById("feedbackText");
    if (baseTemp < 36) {
      feedbackText.textContent = "Low facial temp—may indicate cool ambient conditions or poor perfusion.";
    } else if (baseTemp < 38) {
      feedbackText.textContent = "Normal temperature range.";
    } else {
      feedbackText.textContent = "🌡️ High fever detected. Medical attention may be needed!";
    }
  }
});

d3.select("#groupSelect").on("change", function () {
  selectedGroup = this.value;
  loadAndComputeOffsets(selectedGroup);
});


d3.select("#alertToggle").on("change", function () {
  const alertOn = this.checked;
  circles.each(function (d) {
    d3.select(this).classed("glow", alertOn && d.temp >= 38);
  });
});


function loadAndComputeOffsets(group) {
  const path = `data/cleaned_${group}_combined.csv`;

  const regionsList = ["forehead", "leftEye", "rightEye", "mouth"];

  d3.csv(path).then(data => {
    data.forEach(d => {
      regionsList.forEach(r => {
        d[regionToColumn[r]] = +d[regionToColumn[r]];
      });
    });

    const offsetMatrix = {};
    regionsList.forEach(baseRegion => {
      offsetMatrix[baseRegion] = {};
      regionsList.forEach(targetRegion => {
        const diffs = data.map(d =>
          d[regionToColumn[targetRegion]] - d[regionToColumn[baseRegion]]
        );
        offsetMatrix[baseRegion][targetRegion] = d3.mean(diffs);
      });
    });

    currentOffsets = offsetMatrix;
  });
}


loadAndComputeOffsets(selectedGroup);
