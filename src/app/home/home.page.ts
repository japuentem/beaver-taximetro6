import { Component } from '@angular/core';
import { Geolocation, Position } from '@capacitor/geolocation';
import { ModalController } from '@ionic/angular';

import { DateTimeService } from '../services/date-time-service.service';
import { GPSLocationService } from '../services/gps-location-serv.service';
import { TarifaService } from '../services/tarifa-service.service';
import { TaximetroService } from '../services/taximetro-service.service';

import { DetalleViajeComponent } from '../components/detalle-viaje/detalle-viaje.component'; // Asegúrate de colocar la ruta correcta
import { InfoTarifasComponent } from '../components/info-tarifas/info-tarifas.component';
import { ReporteViajesComponent } from '../components/reporte-viajes/reporte-viajes.component';
import { AcercaDeComponent } from '../components/acerca-de/acerca-de.component'; // Asegúrate de colocar la ruta correcta

import { AdmobService } from '../services/admob.service';
@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss', 'home.extra.scss'],
})
export class HomePage {
  buttonLabel: string = 'Iniciar';
  buttonColor: string = 'success';
  buttonIcon: string = 'car';
  selectedOption: string | null = null;
  buttonDisabled: boolean = true;

  currentTime: Date;
  currentDate: string = ''; // Fecha del encabezado

  isLocationOn: boolean = false;
  isDay: boolean = false;

  startedTrip: boolean = false;
  finishedTrip: boolean = false;
  travelCost: number = 0;
  taxiSelected: string = '';

  intervalCostTime: any;

  speedWatchId: string = '';

  timeInterval: any;
  timeTraveledFormatted: string = '00:00:00';
  timeTimes: number = 0;
  accumulatedTime: number = 0;
  timeTraveled: number = 1;
  timeElapsed: any;

  timesDistance: number = 0;
  distance: number = 0;
  accumulatedDistance: number = 0;
  totalDistanceTraveled: number = 0;

  chargeByTime: boolean = false;
  chargeByDistance: boolean = false;

  fare: number = 0;
  increaseFare: number = 0;

  ticket: boolean = false;
  total: number = 0;
  speedometer = 0;
  previousPosition: Position | undefined;
  previousTimestamp: number = 0;

  taxiTypes = [
    { value: 'libre', label: 'Libre' },
    { value: 'sitio', label: 'Sitio' },
    { value: 'radio', label: 'Radio Taxi' },
  ];
  currentClass: string = 'red-light';

  constructor(
    private dateTimeService: DateTimeService,
    private gpsLocationService: GPSLocationService,
    private tarifaService: TarifaService,
    private taximetroService: TaximetroService,
    private modalController: ModalController,
    private admobService: AdmobService
  ) {
    this.currentTime = new Date();
    this.currentDate = this.dateTimeService.convertirFecha(this.currentTime);

    this.checkUbicacionActivada();
  }

  ngOnInit() {
    setInterval(() => {
      this.currentTime = new Date();
    }, 1000);

    this.admobService.showBannerAd();
  }

  ngOnDestroy() {
    this.admobService.hideBannerAd();
  }

  checkUbicacionActivada() {
    this.gpsLocationService.checkUbicacionActivada().then(
      (ubicacionActivada: boolean) => {
        this.isLocationOn = ubicacionActivada;
      },
      (error) => {
        console.log('No se pudo obtener la ubicación');
      }
    );
  }

  tipoTarifa(): boolean {
    const currentHour = this.currentTime.getHours();
    return currentHour >= 5 && currentHour < 22 ? (this.isDay = true) : false;
  }

  obtenerNumeroTarifa(): number {
    return this.tarifaService.obtenerNumeroTarifa(this.taxiSelected);
  }

  handleButtonClick() {
    switch (this.buttonLabel) {
      case 'Iniciar':
        this.startTravel();
        this.buttonLabel = 'Terminar';
        this.buttonColor = 'danger';
        this.buttonIcon = 'hand-right-outline'; // Cambia al icono de "terminar"
        break;
      case 'Terminar':
        this.stopTravel();
        this.buttonLabel = 'Reiniciar';
        this.buttonColor = 'primary';
        this.buttonIcon = 'refresh-outline'; // Cambia al icono de "reiniciar"
        break;
      case 'Reiniciar':
        this.restartTaximeter();
        this.buttonLabel = 'Iniciar';
        this.buttonColor = 'success';
        this.buttonIcon = 'car'; // Cambia de nuevo al icono de "iniciar"
        break;
    }
  }

  isButtonDisabled() {
    if (this.buttonLabel === 'Iniciar') {
      return this.startedTrip || this.finishedTrip || !this.taxiSelected;
    } else if (this.buttonLabel === 'Terminar') {
      return this.finishedTrip || !this.startedTrip;
    } else if (this.buttonLabel === 'Reiniciar') {
      return this.startedTrip;
    }
    return false;
  }
  startTravel() {
    this.startedTrip = true;
    this.finishedTrip = false;
    this.totalDistanceTraveled = 0;
    this.initialFare();
    this.startTimerCostTime();
    this.timeTraveled = 1;
    this.updateTimeTraveledFormatted();
    this.taximetroService.iniciarViaje();
    this.timeInterval = setInterval(() => {
      this.timeTraveled++;
      this.updateTimeTraveledFormatted();
    }, 1000);
    this.startSpeedMeasurement();

    this.ticket = false;
  }

  initialFare() {
    this.validateFare(2);
    this.travelCost = this.fare;
  }

  validateFare(opcion: number) {
    const { tarifa, aumento } = this.tarifaService.validarTarifa(
      opcion,
      this.currentTime,
      this.taxiSelected
    );
    this.fare = tarifa;
    this.increaseFare = aumento;
  }

  startTimerCostTime() {
    this.intervalCostTime = setInterval(() => {
      this.updateCostByTime();
    }, 45000);
  }

  updateCostByTime() {
    this.validateFare(1);
    this.travelCost += this.increaseFare;
    this.timeTimes++;
    this.chargeByTime = true;
    this.chargeByDistance = false;
    this.restartTimers();
  }

  restartTimers() {
    clearInterval(this.intervalCostTime);
    this.distance = 0;
    this.startTimerCostTime();
  }

  async startSpeedMeasurement() {
    const watchOptions = { enableHighAccuracy: true };
    const watchId = await Geolocation.watchPosition(
      watchOptions,
      (position, err) => {
        if (position && position.coords) {
          if (this.previousPosition && this.previousTimestamp) {
            const distance = this.calculateHaversineDistance(
              this.previousPosition.coords.latitude,
              this.previousPosition.coords.longitude,
              position.coords.latitude,
              position.coords.longitude
            );
            this.distance += distance;
            this.accumulatedDistance += distance;

            const timeElapsed =
              (position.timestamp - this.previousTimestamp) / 1000; // en segundos

            this.timeElapsed = timeElapsed;

            if (timeElapsed > 0) {
              this.speedometer = (distance / timeElapsed) * 3.6; // km/hr
            }

            if (this.distance * 1000 >= 250) {
              this.validateFare(1);
              this.travelCost += this.increaseFare;
              this.timesDistance++;

              this.chargeByTime = false;
              this.chargeByDistance = true;
              this.distance = 0;
              this.restartTimers();
            }
          }

          this.previousPosition = position;
          this.previousTimestamp = position.timestamp;
        }
      }
    );

    this.speedWatchId = watchId;
  }

  stopTravel() {
    this.taximetroService.terminarViaje();
    clearInterval(this.intervalCostTime);
    clearInterval(this.timeInterval);

    const storedData = localStorage.getItem('recorridos');
    const recorridos = storedData ? JSON.parse(storedData) : [];
    const fecha = new Date();
    const hh: string = fecha.getHours().toString().padStart(2, '0');
    const mm: string = fecha.getMinutes().toString().padStart(2, '0');
    const ss: string = fecha.getSeconds().toString().padStart(2, '0');
    const currentTime: string = `${hh}:${mm}:${ss}`;
    const nuevoRecorrido = {
      fecha: fecha.toLocaleDateString('es-ES'),
      hora: currentTime,
      tiempo: this.timeTraveledFormatted, // Reemplaza con el tiempo real
      cost: this.travelCost.toFixed(2),
      type: this.taxiSelected,
    };
    recorridos.push(nuevoRecorrido);
    localStorage.setItem('recorridos', JSON.stringify(recorridos));

    this.calculateTravelDetail();
    this.startedTrip = false;
    this.finishedTrip = true;
    this.timeTimes = 0;
    this.timesDistance = 0;
    this.distance = 0;

    this.stopSpeedMeasurement();
    this.ticket = true;
  }

  async calculateTravelDetail() {
    this.accumulatedTime = this.increaseFare * this.timeTimes;
    this.accumulatedDistance = this.increaseFare * this.timesDistance;

    this.total = this.fare + this.accumulatedTime + this.accumulatedDistance;
  }

  stopSpeedMeasurement() {
    if (this.speedWatchId) {
      Geolocation.clearWatch({ id: this.speedWatchId });
      this.speedWatchId = '';
    }
  }

  restartTaximeter() {
    clearInterval(this.intervalCostTime);
    clearInterval(this.timeInterval);

    this.startedTrip = false;
    this.finishedTrip = false;
    this.taxiSelected = '';

    this.travelCost = 0;
    this.timeTraveled = 0;
    this.chargeByTime = false;
    this.totalDistanceTraveled = 0;
    this.speedometer = 0;
    this.distance = 0;
    this.updateTimeTraveledFormatted();
    this.accumulatedTime = 0;

    this.chargeByDistance = false;
    this.accumulatedDistance = 0;
    this.ticket = false;
  }

  private updateTimeTraveledFormatted() {
    const hours = Math.floor(this.timeTraveled / 3600);
    const minutes = Math.floor((this.timeTraveled % 3600) / 60);
    const seconds = this.timeTraveled % 60;

    this.timeTraveledFormatted = `${this.padZero(hours)}:${this.padZero(
      minutes
    )}:${this.padZero(seconds)}`;
  }

  private padZero(value: number): string {
    return value < 10 ? `0${value}` : value.toString();
  }

  calculateHaversineDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const earthRadius = 6371; // Radio de la Tierra en kilómetros
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) *
        Math.cos(this.deg2rad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = earthRadius * c;
    return distance;
  }

  deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  toggleClass() {
    const classes = ['red-light', 'green-light', 'blue-light', 'white-light'];
    const currentIndex = classes.indexOf(this.currentClass);
    this.currentClass = classes[(currentIndex + 1) % classes.length];
  }

  selectRadio(value: string) {
    if (!this.startedTrip && !this.finishedTrip) {
      this.taxiSelected = value;
    }
  }

  async showTicket() {
    const modal = await this.modalController.create({
      component: DetalleViajeComponent,
      componentProps: {
        tarifa: this.fare.toFixed(2),
        acumuladoTiempo: this.accumulatedTime.toFixed(2),
        acumuladoDistancia: this.accumulatedDistance.toFixed(2),
        total: this.total.toFixed(2),
        distanceTraveled: this.distance.toFixed(2),
        tiempoViajeFormatted: this.timeTraveledFormatted,
      },
    });

    await modal.present();
  }

  async showReport() {
    const modal = await this.modalController.create({
      component: ReporteViajesComponent,
    });

    await modal.present();
  }

  async showOptions() {
    const modal = await this.modalController.create({
      component: InfoTarifasComponent,
    });

    await modal.present();
  }

  async aboutApp() {
    const modal = await this.modalController.create({
      component: AcercaDeComponent,
    });

    await modal.present();
  }

  selectOption(option: string) {
    if (!this.startedTrip && !this.finishedTrip) {
      if (this.selectedOption === option) {
        // Deselect if the same option is clicked
        this.selectedOption = null;
      } else {
        this.selectedOption = option;
      }
      this.updateButtonState();
    }
  }

  updateButtonState() {
    this.buttonDisabled = this.selectedOption === null;
  }

  toggleOption(option: string) {
    if (this.taxiSelected === option) {
      // Desmarcar la opción si es la misma que la seleccionada
      this.taxiSelected = '';
    } else {
      // Seleccionar la nueva opción
      this.taxiSelected = option;
    }
    this.updateButtonState();
  }
}
