var VSHADER_SOURCE = `
  attribute vec4 a_Position;
  attribute vec4 a_Color;
  varying vec4 v_FragColor;
  uniform mat4 u_TransformMatrix;
  void main() {
    gl_Position = u_TransformMatrix*a_Position;
    v_FragColor=a_Color;
    gl_PointSize = 10.0;
  }`;

var FSHADER_SOURCE = `
  precision mediump float;
  varying vec4 v_FragColor;
  void main(){
    gl_FragColor = v_FragColor;
  }`;

function main() {
  var canvas = document.getElementById('webgl');
  var body = document.getElementsByTagName('body')[0];
  var gl = getWebGLContext(canvas);

  if (!gl) {
    console.log('Failed to get the WebGL context');
    return;
  }
  //manda a la tarjeta grafica
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.log('Failed to initialize shaders');
    return;
  }
  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL);
  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  canvas.onmousedown = function (ev) {
    if (ev.buttons == 1) {
      click(ev, gl, canvas);
    }
  }
  //click derecho
  canvas.oncontextmenu = function (ev) { rightclick(ev, gl); return false; }
  body.onkeydown = function (ev) { depthchange(ev); }
}

function initVertexBuffer(gl, vertices, colores) {
  var n = vertices.length;
  //creamos buffer
  var vertexBuffer = gl.createBuffer();
  //crear relacion del buffer con el array buffer (crear puente)
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  //Mandar datos al vertexBuffer con array buffer, DYNAMIC_DRAW es arreglo dinamico, DYNAMIC_DRAW es una pista para que el gpu sea eficiente
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.DYNAMIC_DRAW);
  //apuntador
  var a_Position = gl.getAttribLocation(gl.program, 'a_Position');
  if (a_Position < 0) {
    console.log('Failed to get location of a_Position');
    return;
  }
  //apuntador de vertices 2 es step
  gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
  //se conecta con un arreglo
  gl.enableVertexAttribArray(a_Position);

  //Translation
  /*var transformMatrix = new Float32Array([
    1.0, 0.0, 0.0, 0.5,
    0.0, 1.0, 0.0, -0.2,
    0.0, 0.0, 1.0, 0.0,
    0.0, 0.0, 0.0, 1.0
  ]);*/
  var radian = angle * Math.PI / 180.0;
  var cosB = Math.cos(radian);
  var sinB = Math.sin(radian);
  var transformMatrix = new Float32Array([
    cosB, -sinB, 0.0, 0.0,
    sinB, cosB, 0.0, 0.0,
    0.0, 0.0, 1.0, 0.0,
    0.0, 0.0, 0.0, 1.0
  ]);
  var u_TransformMatrix = gl.getUniformLocation(gl.program, 'u_TransformMatrix');
  if (!u_TransformMatrix) { console.log('Failed to get location of u_TransformMatrix'); }
  gl.uniformMatrix4fv(u_TransformMatrix, false, transformMatrix);
  //quita la conexion para usarla despues
  gl.bindBuffer(gl.ARRAY_BUFFER, null);
  var colorBuffer = gl.createBuffer();
  //crear relacion del buffer con el array buffer (crear puente)
  gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
  //Mandar datos al vertexBuffer con array buffer, DYNAMIC_DRAW es arreglo dinamico, DYNAMIC_DRAW es una pista para que el gpu sea eficiente
  gl.bufferData(gl.ARRAY_BUFFER, colores, gl.DYNAMIC_DRAW);
  //apuntador de varible de color
  var a_Color = gl.getAttribLocation(gl.program, 'a_Color');
  if (a_Color < 0) {
    console.log('Failed to get location of u_FragColor');
    return;
  }
  gl.vertexAttribPointer(a_Color, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_Color);
  return n;
}

var g_points = [];
var g_colors = [];
var index = 0;
var z = 0;
var angle = 0.0;
function click(ev, gl, canvas) {
  var x = ev.clientX;
  var y = ev.clientY;
  var rect = ev.target.getBoundingClientRect();
  //arreglar posicion webgl empieza en el centro, las pagins web de top left
  x = ((x - rect.left) - canvas.width / 2) / (canvas.width / 2);
  y = (canvas.height / 2 - (y - rect.top)) / (canvas.height / 2);
  if (g_points.length <= index) {
    var arrayPoints = [];
    g_points.push(arrayPoints);
    var arrayColors = [];
    g_colors.push(arrayColors);
  }
  g_points[index].push(x);
  g_points[index].push(y);
  g_points[index].push(z);

  g_colors[index].push(Math.random());
  g_colors[index].push(Math.random());
  g_colors[index].push(Math.random());

  draw(gl);
}
function draw(gl) {
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  for (var i = 0; i < g_points.length; i++) {
    var n = initVertexBuffer(gl, new Float32Array(g_points[i]), new Float32Array(g_colors[i])) / 3;
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, n);
  }
}
function rightclick(ev, gl) {
  if (g_points[index]) {
    index++;
  }
  angle += 10.0;
  draw(gl);
}
function depthchange(ev) {
  if (ev.key == "Shift") {
    z = 1;
  }
  else if (ev.key == "Control") {
    z = -1;
  }
}