/** @type {HTMLCanvasElement} */
const canvas = document.getElementById('canvas1');
const ctx = canvas.getContext('2d');
CANVAS_WIDTH = canvas.width = 500;
CANVAS_HEIGHT = canvas.height = 1000;
const numberOfFlowers = 20;
const floatingFlowers = [];

var cursor = document.getElementById('cursor');
document.addEventListener('mousemove', function (e) {
  var x = e.clientX;
  var y = e.clientY;
  cursor.style.left = x + 'px';
  cursor.style.top = y + 'px';
});

class Flower {
  constructor() {
    this.image = new Image();
    this.image.src = 'flower.png';
    this.x = Math.random() * canvas.width;
    this.y = Math.random() * canvas.height;
    this.spriteSize = Math.random() * 50 + 30;
    this.speed = Math.random() * 3 + 1;
    this.angle = Math.random() * 360;
    this.spin = Math.random() < 0.5 ? -1 : 1;
  }
  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(((this.angle * Math.PI) / 360) * this.spin);
    ctx.drawImage(
      this.image,
      0 - this.spriteSize / 2,
      0 - this.spriteSize / 2,
      this.spriteSize,
      this.spriteSize
    );
    ctx.restore();
  }
  update() {
    this.y += this.speed;
    this.angle++;
    if (this.y > canvas.height) {
      this.y = 0 - this.spriteSize;
      this.x = Math.random() * canvas.width;
      this.spriteSize = Math.random() * 50 + 30;
      this.speed = Math.random() * 3 + 1;
    }
  }
}

function init() {
  for (let i = 0; i < numberOfFlowers; i++) {
    floatingFlowers.push(new Flower());
  }
}
init();

function animate() {
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  floatingFlowers.forEach((flower) => {
    flower.update();
    flower.draw();
  });
  requestAnimationFrame(animate);
}
animate();
