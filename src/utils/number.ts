export const isValidPositiveNumber = (number: string) => {
  var regex = /^\d*\.?\d+$/;
  return regex.test(number) && parseFloat(number) >= 0;
}