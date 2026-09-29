// Placeholder controller for Tasks

export const getTasks = (req, res) => {
  res.status(200).json({
    success: true,
    message: "Get tasks placeholder",
    data: {}
  });
};
