import React, { useEffect, useState } from "react";
import { View, Text, FlatList, StyleSheet, Linking, Platform } from "react-native";
import MapView, { Marker } from "react-native-maps";
import * as Location from "expo-location";

export default function App() {
  const [parkingData, setParkingData] = useState([]);
  const [userLocation, setUserLocation] = useState(null);

  const getDistanceFromLatLonInKm = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const openNavigation = (lat, lng, label) => {
    const url = Platform.select({
      ios: `http://maps.apple.com/?daddr=${lat},${lng}&q=${label}`,
      android: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`,
    });
    Linking.openURL(url);
  };

  const fetchData = async () => {
    try {
      const res = await fetch("https://kpp.tbkc.gov.tw/ParkingLocation/GetParkingLocation");
      const data = await res.json();
      if (userLocation) {
        const sorted = data
          .map((item) => ({
            ...item,
            distance: getDistanceFromLatLonInKm(
              userLocation.latitude,
              userLocation.longitude,
              item.Latitude,
              item.Longitude
            ),
          }))
          .sort((a, b) => a.distance - b.distance);
        setParkingData(sorted);
      } else {
        setParkingData(data);
      }
    } catch (err) {
      console.error("資料讀取失敗：", err);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [userLocation]);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        console.log("位置權限未授權");
        return;
      }
      let location = await Location.getCurrentPositionAsync({});
      setUserLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
    })();
  }, []);

  return (
    <View style={{ flex: 1 }}>
      {userLocation && (
        <MapView
          style={styles.map}
          initialRegion={{
            latitude: userLocation.latitude,
            longitude: userLocation.longitude,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          }}
        >
          <Marker
            coordinate={userLocation}
            title="你的位置"
            pinColor="blue"
          />
          {parkingData.map((item) => (
            <Marker
              key={item.ParkingID}
              coordinate={{
                latitude: item.Latitude,
                longitude: item.Longitude,
              }}
              title={item.ParkingName}
              description={`剩餘：${item.SurplusSpace} / 約 ${item.distance?.toFixed(1)} 公里`}
              onCalloutPress={() => openNavigation(item.Latitude, item.Longitude, item.ParkingName)}
            />
          ))}
        </MapView>
      )}
      <FlatList
        data={parkingData}
        keyExtractor={(item) => item.ParkingID.toString()}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <Text style={styles.title}>{item.ParkingName}</Text>
            <Text>地址：{item.Address}</Text>
            <Text>剩餘車位：{item.SurplusSpace}</Text>
            <Text>距離：約 {item.distance?.toFixed(2)} 公里</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  map: {
    width: "100%",
    height: 300,
  },
  item: {
    padding: 10,
    borderBottomWidth: 1,
    borderColor: "#ccc",
  },
  title: {
    fontWeight: "bold",
  },
});
