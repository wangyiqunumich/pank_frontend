import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';

import React, {
  useEffect,
  useState,
} from 'react';

import Slider from 'react-slick';

import {
  ArrowBackIos,
  ArrowForwardIos,
  CheckCircle,
  Close,
  Description,
  Equalizer,
  Error,
  FiberManualRecord,
  Info,
  KeyboardArrowDown,
  KeyboardArrowUp,
  Link,
  Notifications,
  Warning,
} from '@mui/icons-material';
import {
  Box,
  Alert,
  Snackbar,
  Card,
  CardContent,
  Container,
  Fade,
  IconButton,
  Stack,
  Typography,
} from '@mui/material';

const iconMap = {
  success: <CheckCircle fontSize="inherit" />,
  error: <Error fontSize="inherit" />,
  warning: <Warning fontSize="inherit" />,
  info: <Info fontSize="inherit" />,
  notification: <Notifications fontSize="inherit" />,
};

const bgColors = {
  success: "#E6F4EA", // Light green
  error: "#FCE8E6", // Light red
  warning: "#FEF7E0", // Light yellow
  info: "#E8F0FE", // Light blue
  notification: "#F3F4F6", // Light gray
};

export const AlertMessage = ({ type = "info", content, sx = {}, open = true, onClose = () => { } }) => {
  return (
    <Snackbar open={open} onClose={() => { }} autoHideDuration={5000} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
      <Alert
        variant="outlined"
        severity={type === "notification" ? "info" : type}
        icon={iconMap[type]}
        action={
          <IconButton size="small" color="inherit" onClick={onClose}>
            <Close fontSize="small" />
          </IconButton>
        }
        sx={{
          backgroundColor: bgColors[type],
          border: "1px solid",
          borderColor: "inherit",
          display: "flex",
          alignItems: "center",
          ...sx,
        }}
      >
        {content}
      </Alert>
    </Snackbar>
  );
};


// const cardData = [
//   [{
//     title: "Reference",
//     icon: "📑",
//     content: [
//       { text: "Guo et al.", link: "#" },
//       { text: "Koivula et al.", link: "#" },
//       { text: "Di Fulvio et al.", link: "#" },
//     ],
//   },
//   {
//     title: "Volcano Plot",
//     icon: "📊",
//     comment: [{ text: "Link to more detail", link: "#" }],
//     image: "https://placehold.co/600x400/EEE/31343C",
//   },
//   {
//     title: "External Link",
//     icon: "🔗",
//     content: [{ text: "Ensemble", link: "#" }],
//   }],
//   [{
//     title: "Reference",
//     icon: "📑",
//     content: [
//       { text: "Guo et al.", link: "#" },
//       { text: "Koivula et al.", link: "#" },
//       { text: "Di Fulvio et al.", link: "#" },
//     ],
//   },
//   {
//     title: "Volcano Plot",
//     icon: "📊",
//     comment: [{ text: "Link to more detail", link: "#" }],
//     image: "https://placehold.co/600x400/EEE/31343C",
//   },
//   {
//     title: "External Link",
//     icon: "🔗",
//     content: [{ text: "Ensemble", link: "#" }],
//   },],
//   [{
//     title: "Reference",
//     icon: "📑",
//     content: [
//       { text: "Guo et al.", link: "#" },
//       { text: "Koivula et al.", link: "#" },
//       { text: "Di Fulvio et al.", link: "#" },
//     ],
//   },
//   {
//     title: "Volcano Plot",
//     icon: "📊",
//     comment: [{ text: "Link to more detail", link: "#" }],
//     image: "https://placehold.co/600x400/EEE/31343C",
//   },],
// ];

const getIcon = (icon) => {
  switch (icon) {
    case "link":
      return <Link sx={{ fontSize: 40 }} />;
    case "ref":
      return <Description sx={{ fontSize: 40 }} />;
    case "plot":
      return <Equalizer sx={{ fontSize: 40 }} />;
    default:
      return null;
  }
}

const ImagePager = ({ images, active }) => {
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    if (!active) {
      setActiveStep(0);
    }
  }
    , [active]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'row-reverse', position: 'relative' }}>

      {images.map((src, index) => (
        <Fade
          in={index === activeStep}
          timeout={500}
          key={index}
        >
          <Box
            component="img"
            src={src}
            alt={`Image ${index + 1}`}
            sx={{
              maxWidth: '65%',
              maxHeight: 200,
              position: 'absolute',
              right: "50px",
              borderRadius: 2,
            }}
          />
        </Fade>
      ))}

      <Stack spacing={1} alignItems="center">
        <IconButton
          onClick={() => { setActiveStep((activeStep - 1 + images.length) % images.length) }}
        >
          <KeyboardArrowUp />
        </IconButton>

        {images.map((_, index) => (
          <IconButton
            key={index}
            onClick={() => { setActiveStep(index) }}
            size="small"
            sx={{
              color: index === activeStep ? 'primary.main' : 'grey.400',
            }}
          >
            <FiberManualRecord fontSize="small" />
          </IconButton>
        ))}

        <IconButton
          onClick={() => { setActiveStep((activeStep + 1) % images.length) }}
        >
          <KeyboardArrowDown />
        </IconButton>
      </Stack>
    </Box>
  );
}

const MaterialCard = ({ data, active }) => {
  return (
    <Container sx={{
      height: 300,
      paddingX: "0 !important",
      marginX: "2px !important",
      overflow: "visible",
    }}>
      <Card
        sx={{
          textAlign: "center",
          alignContent: "center",
          height: "100%",
          width: "100%",
          color: "black",
          display: "flex",
          justifyContent: "center",
          alignItems: "space-between",

          backgroundColor: '#FBFBFB',
          border: 1,
          borderColor: '#EEEEEE',
          borderRadius: '20px',
          boxShadow: 0,
        }}
      >
        <CardContent sx={{ width: "100%", p: 2, position: "relative" }}>
          <Box
            sx={{
              width: "70px",
              height: "70px",
              borderRadius: '50%',
              backgroundColor: '#E4F0F1',
              color: 'black',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'absolute',
              top: "25px",
              left: "25px",
            }}
          >
            {getIcon(data.icon)}
          </Box>
          <Typography variant="h5" sx={{ alignSelf: "center", pb: 3, fontWeight: "bold" }}>
            {data.title}
          </Typography>
          {data.image && (
            // <Box component="img"
            //   src={data.image}
            //   alt={data.title} sx={{
            //     width: "100%", height: 100, objectFit: "contain", my: 1, display: "flex",
            //     justifyContent: "center",
            //     alignItems: "center"
            //   }}
            // />
            <ImagePager images={data.image} active={active} />
          )}
          {data.content && data.content.map((link, idx) => (
            <Typography key={idx} variant="body1" sx={{ textAlign: "left", pl: "calc(100%/5)" }}>
              <a href={link.link} style={{ textDecoration: "underline", fontWeight: "bold", color: 'black' }}>
                {idx + 1}. {link.text}
              </a>
            </Typography>
          ))}
          {data.comment && data.comment.map((link, idx) => (
            <Typography key={idx} variant="body1">
              <a href={link.link} style={{ textDecoration: 'underline', color: 'black', fontWeight: "bold" }}>
                {link.text}
              </a>
            </Typography>
          ))}
        </CardContent>
      </Card>
    </Container>
  );
}


function CarouselCards({ cardData }) {
  const sliderRef = React.useRef(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const settings = {
    dots: true,
    infinite: cardData.length > 1,
    speed: 500,
    arrows: false,
    slidesToShow: 1,
    slidesToScroll: 1,
    // variableWidth: false,
    // arrows: false,
    // customPaging: (i) => (
    //   <Box
    //     sx={{
    //       width: 10,
    //       height: 10,
    //       bgcolor: "gray",
    //       borderRadius: "50%",
    //       display: "inline-block",
    //       mx: 0.5,
    //       transition: "background-color 0.3s",
    //     }}
    //   />
    // ),
    appendDots: _ =>
      <Box sx={{ alignSelf: "center", justifyContent: "center", paddingTop: "10px", gap: "10px", display: "flex" }}>
        {Array.apply(null, { length: cardData.length }).map((_, index) => (
          <IconButton
            key={index}
            onClick={() => { sliderRef.current.slickGoTo(index) }}
            size="small"
            sx={{
              color: index === currentIndex ? 'primary.main' : 'grey.400',
            }}
          >
            <FiberManualRecord fontSize="small" />
          </IconButton>
        ))}</Box>
    ,
    customPaging: index => (
      <IconButton
        key={index}
        onClick={() => { setCurrentIndex(index) }}
        size="medium"
        sx={{
          color: index === currentIndex ? 'primary.main' : 'grey.400',
        }}
      >
        <FiberManualRecord fontSize="large" />
      </IconButton>
      // <Box sx={{
      //   justifyContent: "center",
      //   alignItems: "center",
      //   width: "20px",
      //   height: "20px",
      // }}>
      // <Box
      //   sx={{
      //     width: "10px",
      //     height: "10px",
      //     borderRadius: '50%',
      //     backgroundColor: 'primary.main',
      //     mr: 2,
      //     flexShrink: 0,
      //   }}
      // /></Box>
    ),
    beforeChange: (current, next) => setCurrentIndex(next)
    // appendDots: (dots) => ( //larger dots
    //  //font size
    // <ul style={{ font-size: "20px" }}>{dots}</ul>
    // ),
  };

  useEffect(() => {
    if (sliderRef.current) {
      sliderRef.current.slickGoTo(currentIndex);
    }
  }, []);

  return (
    <Box sx={{
      position: "relative", maxWidth: '1480px', width: "100%",
      minWidth: '1040px', pb: 2, height: "auto", alignSelf: "center", display: "flex", flexDirection: "row", justifyContent: "center"
    }}>

      {/* Left Arrow */}
      <IconButton
        disabled={cardData.length <= 1}
        onClick={() => sliderRef.current.slickPrev()}
        sx={{
          // left: 0,
          // top: "50%",
          // transform: "translateY(-50%)",
          position: "absolute",
          top: "160px",
          transform: "translateY(-50%)",
          left: "-60px",
          width: 50,
          height: 50,
          bgcolor: "white",
          boxShadow: 0,
          border: 1,
          borderColor: '#EEEEEE',
          backgroundColor: '#FBFBFB',
          zIndex: 10, // Ensure arrows stay above carousel
        }}
      >
        <ArrowBackIos />
      </IconButton>

      {/* Slider */}
      <Container sx={{
        maxWidth: '1480px !important',
        minWidth: '1040px', height: "350px", alignSelf: "center",
        px: "0 !important",
      }}>
        <Slider ref={sliderRef} {...settings}>
          {cardData.map((item, index) => (
            <Stack direction="row" key={index} sx={{
              maxWidth: '1440px',
              minWidth: '1000px',
              paddingX: '20px',
              height: "310px",
              pt: 2,
              display: "flex !important",
              flexDirection: "row !important",
              justifyContent: "center !important",
              gap: "40px",
            }}>
              {item.map((item, index1) => (
                <MaterialCard key={index1} data={item} active={index === currentIndex} />
              ))}
            </Stack>

          ))}
        </Slider>
      </Container>

      {/* Right Arrow */}
      <IconButton
        disabled={cardData.length <= 1}
        onClick={() => sliderRef.current.slickNext()}
        sx={{
          position: "absolute",
          top: "160px",
          transform: "translateY(-50%)",
          right: "-60px",
          width: 50,
          height: 50,
          bgcolor: "white",
          boxShadow: 0,
          border: 1,
          borderColor: '#EEEEEE',
          alignSelf: "center",
          backgroundColor: '#FBFBFB',
          zIndex: 10,
        }}
      >
        <ArrowForwardIos />
      </IconButton>
    </Box>
  );
}


export default CarouselCards;
