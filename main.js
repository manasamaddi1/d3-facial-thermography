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
  { name: "nose", cx: 200, cy: 285, temp: 37 },
  { name: "mouth", cx: 200, cy: 355, temp: 37 }
];

const colorScale = d3.scaleLinear()
  .domain([35, 37.5, 40])
  .range(["#4575b4", "#ffffbf", "#d73027"]);

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
  });

let selectedRegion = null;

const slider = d3.select("#tempSlider");
slider.on("input", function () {
  const newTemp = +this.value;
  d3.select("#tempDisplay").text(newTemp.toFixed(1));

  if (selectedRegion) {
    selectedRegion.temp = newTemp;
    d3.select(`#${selectedRegion.name}`)
      .attr("fill", colorScale(newTemp));

    if (d3.select("#alertToggle").property("checked")) {
      d3.select(`#${selectedRegion.name}`)
        .classed("glow", newTemp >= 38);
    } else {
      d3.selectAll("circle").classed("glow", false);
    }

    const feedbackText = document.getElementById("feedbackText");
    if (newTemp < 36) {
      feedbackText.textContent = "Low facial temp—may indicate cool ambient conditions or poor perfusion.";
    } else if (newTemp < 38) {
      feedbackText.textContent = "Normal temperature range.";
    } else {
      feedbackText.textContent = "Elevated temperature—possible fever.";
    }
  }
});

d3.select("#alertToggle").on("change", function () {
  const alertOn = this.checked;
  circles.each(function (d) {
    d3.select(this).classed("glow", alertOn && d.temp >= 38);
  });
});
