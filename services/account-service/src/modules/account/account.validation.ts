import { body, param, ValidationChain } from 'express-validator';

export const validateCreateProfile = (): ValidationChain[] => [
  body('firstName')
    .trim()
    .notEmpty()
    .withMessage('First name is required')
    .isLength({ min: 2 })
    .withMessage('First name must be at least 2 characters'),
  body('lastName')
    .trim()
    .notEmpty()
    .withMessage('Last name is required')
    .isLength({ min: 2 })
    .withMessage('Last name must be at least 2 characters'),
  body('phone')
    .optional()
    .trim()
    .matches(/^[0-9+\-\s()]+$/)
    .withMessage('Invalid phone number format'),
  body('bio')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Bio must be at most 500 characters'),
];

export const validateUpdateProfile = (): ValidationChain[] => [
  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 2 })
    .withMessage('First name must be at least 2 characters'),
  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 2 })
    .withMessage('Last name must be at least 2 characters'),
  body('phone')
    .optional()
    .trim()
    .matches(/^[0-9+\-\s()]+$/)
    .withMessage('Invalid phone number format'),
  body('bio')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Bio must be at most 500 characters'),
  body('emailNotifications')
    .optional()
    .isBoolean()
    .withMessage('emailNotifications must be boolean'),
  body('smsNotifications')
    .optional()
    .isBoolean()
    .withMessage('smsNotifications must be boolean'),
  body('marketingEmails')
    .optional()
    .isBoolean()
    .withMessage('marketingEmails must be boolean'),
];

export const validateAddAddress = (): ValidationChain[] => [
  body('type')
    .isIn(['HOME', 'WORK', 'OTHER'])
    .withMessage('Type must be HOME, WORK, or OTHER'),
  body('label')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Label must be at most 100 characters'),
  body('fullName')
    .trim()
    .notEmpty()
    .withMessage('Full name is required'),
  body('phoneNumber')
    .trim()
    .matches(/^[0-9+\-\s()]+$/)
    .withMessage('Invalid phone number format'),
  body('street')
    .trim()
    .notEmpty()
    .withMessage('Street is required'),
  body('streetNumber')
    .trim()
    .notEmpty()
    .withMessage('Street number is required'),
  body('district')
    .trim()
    .notEmpty()
    .withMessage('District is required'),
  body('ward')
    .trim()
    .notEmpty()
    .withMessage('Ward is required'),
  body('city')
    .trim()
    .notEmpty()
    .withMessage('City is required'),
  body('zipCode')
    .trim()
    .notEmpty()
    .withMessage('Zip code is required'),
  body('country')
    .optional()
    .trim()
    .isLength({ exactly: 2 })
    .withMessage('Country must be 2-letter code'),
];

export const validateUpdateAddress = (): ValidationChain[] => [
  param('addressId')
    .trim()
    .notEmpty()
    .withMessage('Address ID is required'),
  body('type')
    .optional()
    .isIn(['HOME', 'WORK', 'OTHER'])
    .withMessage('Type must be HOME, WORK, or OTHER'),
  body('label')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Label must be at most 100 characters'),
  body('fullName')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Full name is required'),
  body('phoneNumber')
    .optional()
    .trim()
    .matches(/^[0-9+\-\s()]+$/)
    .withMessage('Invalid phone number format'),
  body('street')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Street is required'),
];

export const validateDeleteAddress = (): ValidationChain[] => [
  param('addressId')
    .trim()
    .notEmpty()
    .withMessage('Address ID is required'),
];
