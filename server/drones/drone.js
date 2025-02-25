class Drone {
    constructor(id) {
        this.id = id;
        this.isFlying = false;
        this.altitude = 0;
        this.baseTemperature = 15;
        this.basePressure = 1013.25;
        this.temperature = this.baseTemperature;
        this.pressure = this.basePressure;
        this.interval = null;
    }

    takeOff() {
        this.isFlying = true;
        this.simulateFlight();
    }

    simulateFlight() {
        this.interval = setInterval(() => {
            if (this.isFlying) {
                this.altitude += Math.random() * 10 + 5;
                this.temperature = this.baseTemperature - (this.altitude / 1000 * 6.5) + (Math.random() - 0.5);
                this.pressure = this.basePressure - (this.altitude / 8) + (Math.random() - 0.5) * 0.2;
                this.pressure = Math.max(this.pressure, 200);
                this.temperature = Math.max(this.temperature, -60);
            }
        }, 1000);
    }

    land() {
        clearInterval(this.interval);
        this.isFlying = false;
    }
}

module.exports = Drone;